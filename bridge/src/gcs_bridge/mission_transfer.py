from collections.abc import Callable

from pymavlink.dialects.v20 import ardupilotmega as mavlink

from gcs_bridge.arducopter import MissionItem
from gcs_bridge.link import MavlinkLink, Message, NoAnswerError, Predicate, Retry, Target, request

MISSION_REPLIES = frozenset({"MISSION_REQUEST_INT", "MISSION_REQUEST", "MISSION_ACK"})


class TransferError(Exception):
    pass


def mission_result_name(result: int) -> str:
    entry = mavlink.enums["MAV_MISSION_RESULT"].get(result)
    return entry.name if entry is not None else str(result)


async def _request(
    link: MavlinkLink, send: Callable[[], object], predicate: Predicate, retry: Retry
) -> Message:
    try:
        return await request(link, send, predicate, retry)
    except NoAnswerError:
        raise TransferError("The vehicle did not answer") from None


async def upload(
    link: MavlinkLink, target: Target, items: list[MissionItem], mission_type: int, retry: Retry
) -> None:
    def is_reply(message: Message) -> bool:
        return (
            message.get_srcSystem() == target.system_id
            and message.get_type() in MISSION_REPLIES
            and message.mission_type == mission_type
        )

    last_sent = link.mav.mission_count_encode(
        target.system_id, target.component_id, len(items), mission_type
    )
    link.send(last_sent)
    misses = 0
    while True:
        try:
            reply = await link.wait_for(is_reply, retry.timeout_s)
        except TimeoutError:
            misses += 1
            if misses >= retry.attempts:
                raise TransferError("The vehicle stopped answering during the upload") from None
            link.send(last_sent)
            continue

        misses = 0
        if reply.get_type() == "MISSION_ACK":
            if reply.type == mavlink.MAV_MISSION_ACCEPTED:
                return
            raise TransferError(f"The vehicle rejected the plan: {mission_result_name(reply.type)}")
        if reply.seq >= len(items):
            raise TransferError(f"The vehicle asked for item {reply.seq} of {len(items)}")
        last_sent = items[reply.seq].to_message(
            link.mav, target.system_id, target.component_id, mission_type
        )
        link.send(last_sent)


async def download(
    link: MavlinkLink, target: Target, mission_type: int, retry: Retry
) -> list[MissionItem]:
    def from_vehicle(message: Message, message_type: str) -> bool:
        return bool(
            message.get_srcSystem() == target.system_id
            and message.get_type() == message_type
            and message.mission_type == mission_type
        )

    async def request_item(seq: int) -> MissionItem:
        def send() -> None:
            link.send(
                link.mav.mission_request_int_encode(
                    target.system_id, target.component_id, seq, mission_type
                )
            )

        def is_item(message: Message) -> bool:
            return from_vehicle(message, "MISSION_ITEM_INT") and message.seq == seq

        return MissionItem.from_message(await _request(link, send, is_item, retry))

    count = await _request(
        link,
        lambda: link.send(
            link.mav.mission_request_list_encode(
                target.system_id, target.component_id, mission_type
            )
        ),
        lambda message: from_vehicle(message, "MISSION_COUNT"),
        retry,
    )
    items = [await request_item(seq) for seq in range(count.count)]
    link.send(
        link.mav.mission_ack_encode(
            target.system_id, target.component_id, mavlink.MAV_MISSION_ACCEPTED, mission_type
        )
    )
    return items


async def clear(link: MavlinkLink, target: Target, mission_type: int, retry: Retry) -> None:
    reply = await _request(
        link,
        lambda: link.send(
            link.mav.mission_clear_all_encode(target.system_id, target.component_id, mission_type)
        ),
        lambda message: (
            message.get_srcSystem() == target.system_id
            and message.get_type() == "MISSION_ACK"
            and message.mission_type == mission_type
        ),
        retry,
    )
    if reply.type != mavlink.MAV_MISSION_ACCEPTED:
        reason = mission_result_name(reply.type)
        raise TransferError(f"The vehicle did not clear the plan: {reason}")
