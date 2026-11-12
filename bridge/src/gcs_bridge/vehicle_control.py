import math
import time

from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.link import MavlinkLink, Message, NoAnswerError, Retry, Target, request

PARAM_TOLERANCE = 1e-4


class CommandRejectedError(Exception):
    pass


def enum_name(enum: str, value: int) -> str:
    entry = mavlink.enums[enum].get(value)
    return entry.name if entry is not None else str(value)


class VehicleControl:
    def __init__(self, link: MavlinkLink, target: Target, retry: Retry) -> None:
        self._link = link
        self.target = target
        self._retry = retry

    async def command(self, command: int, *params: float) -> None:
        padded = [*params, *([0.0] * (7 - len(params)))]
        confirmation = 0

        def send() -> None:
            nonlocal confirmation
            self._link.send(
                self._link.mav.command_long_encode(
                    self.target.system_id,
                    self.target.component_id,
                    command,
                    confirmation,
                    *padded,
                )
            )
            confirmation += 1

        def is_ack(message: Message) -> bool:
            return bool(
                message.get_srcSystem() == self.target.system_id
                and message.get_type() == "COMMAND_ACK"
                and message.command == command
            )

        try:
            ack = await request(self._link, send, is_ack, self._retry)
        except NoAnswerError as error:
            raise CommandRejectedError(f"{enum_name('MAV_CMD', command)}: no answer") from error
        if ack.result != mavlink.MAV_RESULT_ACCEPTED:
            raise CommandRejectedError(
                f"{enum_name('MAV_CMD', command)}: {enum_name('MAV_RESULT', ack.result)}"
            )

    async def set_mode(self, custom_mode: int) -> None:
        await self.command(
            mavlink.MAV_CMD_DO_SET_MODE, mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED, custom_mode
        )

    async def arm(self) -> None:
        await self.command(mavlink.MAV_CMD_COMPONENT_ARM_DISARM, 1)

    async def takeoff(self, altitude_m: float) -> None:
        await self.command(mavlink.MAV_CMD_NAV_TAKEOFF, 0, 0, 0, 0, 0, 0, altitude_m)

    async def set_mission_current(self, seq: int) -> None:
        await self.command(mavlink.MAV_CMD_DO_SET_MISSION_CURRENT, seq)

    async def enable_fence(self, enabled: bool) -> None:
        await self.command(mavlink.MAV_CMD_DO_FENCE_ENABLE, 1 if enabled else 0)

    async def set_battery_percent(self, percent: float) -> None:
        await self.command(mavlink.MAV_CMD_BATTERY_RESET, 1, percent)

    async def set_message_rate(self, message_id: int, hertz: float) -> None:
        await self.command(mavlink.MAV_CMD_SET_MESSAGE_INTERVAL, message_id, 1_000_000 / hertz)

    async def set_param(self, name: str, value: float) -> None:
        def is_value(message: Message) -> bool:
            return bool(
                message.get_srcSystem() == self.target.system_id
                and message.get_type() == "PARAM_VALUE"
                and message.param_id == name
            )

        try:
            reply = await request(
                self._link,
                lambda: self._link.send(
                    self._link.mav.param_set_encode(
                        self.target.system_id,
                        self.target.component_id,
                        name.encode(),
                        value,
                        mavlink.MAV_PARAM_TYPE_REAL32,
                    )
                ),
                is_value,
                self._retry,
            )
        except NoAnswerError as error:
            raise CommandRejectedError(f"{name}: no answer") from error
        if not math.isclose(reply.param_value, value, abs_tol=PARAM_TOLERANCE):
            raise CommandRejectedError(f"{name} stayed at {reply.param_value}")

    async def ping(self) -> float:
        sent_ns = time.monotonic_ns()
        try:
            await request(
                self._link,
                lambda: self._link.send(self._link.mav.timesync_encode(0, sent_ns)),
                lambda message: bool(
                    message.get_srcSystem() == self.target.system_id
                    and message.get_type() == "TIMESYNC"
                    and message.tc1 != 0
                    and message.ts1 == sent_ns
                ),
                self._retry,
            )
        except NoAnswerError as error:
            raise CommandRejectedError("TIMESYNC: no answer from the autopilot") from error
        return (time.monotonic_ns() - sent_ns) / 1e9
