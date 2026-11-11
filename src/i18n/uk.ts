import type { Messages } from './en'
import { pluralize, type PluralForms } from './plural'

function count(value: number, forms: PluralForms): string {
  return `${String(value)} ${pluralize('uk', value, forms)}`
}

const POINTS = { one: 'точка', few: 'точки', many: 'точок', other: 'точки' }
const POINTS_GENITIVE = { one: 'точки', other: 'точок' }
const VERTICES = { one: 'вершина', few: 'вершини', many: 'вершин', other: 'вершини' }
const VERTICES_ACCUSATIVE = { one: 'вершину', few: 'вершини', many: 'вершин', other: 'вершини' }
const VERTICES_GENITIVE = { one: 'вершини', other: 'вершин' }

export const uk: Messages = {
  app: {
    language: 'Мова',
  },
  units: {
    meters: 'м',
    kilometers: 'км',
    metersPerSecond: 'м/с',
    seconds: 'с',
    milliseconds: 'мс',
    percent: '%',
    satellites: 'суп.',
  },
  connection: {
    status: {
      disconnected: 'Від’єднано',
      connecting: 'Підключення…',
      connected: 'Підключено',
      reconnecting: 'Перепідключення…',
    },
    connect: 'Підключити',
    disconnect: 'Від’єднати',
  },
  alerts: {
    region: 'Сповіщення',
    none: 'Немає активних сповіщень',
    active: (total) =>
      count(total, {
        one: 'активне сповіщення',
        few: 'активні сповіщення',
        many: 'активних сповіщень',
        other: 'активного сповіщення',
      }),
    severity: { critical: 'Критично', warning: 'Увага' },
    acknowledge: 'Підтвердити',
    acknowledgeAlert: (message) => `Підтвердити: ${message}`,
    linkLost: (seconds) => `Зв’язок втрачено: понад ${String(seconds)} с без heartbeat`,
    geofenceBreach: 'Апарат поза геозоною',
    batteryBelow: (percent) => `Заряд батареї нижче ${String(percent)}%`,
    gpsFixLost: 'Втрачено GPS-фіксацію в польоті',
  },
  telemetry: {
    title: 'Телеметрія',
    attitudeIndicator: 'Авіагоризонт',
    readouts: {
      flightMode: 'Режим польоту',
      arming: 'Двигуни',
      altitude: 'Висота',
      groundSpeed: 'Шляхова швидкість',
      heading: 'Курс',
      roll: 'Крен',
      pitch: 'Тангаж',
      battery: 'Батарея',
      gps: 'GPS',
      linkQuality: 'Якість зв’язку',
    },
    armed: 'Розблоковано',
    disarmed: 'Заблоковано',
    noGpsFix: 'Без фіксації',
  },
  map: {
    title: 'Карта',
    followVehicle: 'Стежити за апаратом',
    loading: 'Завантаження карти…',
    vehicle: 'Апарат',
    home: 'Точка старту',
    controls: {
      'AttributionControl.ToggleAttribution': 'Показати або сховати джерела карти',
      'AttributionControl.MapFeedback': 'Відгук про карту',
      'Map.Title': 'Карта',
      'Marker.Title': 'Маркер на карті',
      'NavigationControl.ResetBearing':
        'Перетягніть, щоб повернути карту; клацніть, щоб повернути на північ',
      'NavigationControl.ZoomIn': 'Наблизити',
      'NavigationControl.ZoomOut': 'Віддалити',
    },
  },
  charts: {
    title: (seconds) =>
      `Останні ${count(seconds, { one: 'секунда', few: 'секунди', many: 'секунд', other: 'секунди' })}`,
    loading: 'Завантаження графіків…',
    titles: {
      altitude: 'Висота',
      groundSpeed: 'Шляхова швидкість',
      batteryAndLink: 'Батарея і зв’язок',
    },
    series: {
      altitude: 'Висота',
      groundSpeed: 'Шляхова швидкість',
      battery: 'Батарея',
      linkQuality: 'Якість зв’язку',
    },
  },
  controls: {
    title: 'Керування',
    tabs: {
      mission: 'Місія',
      geofence: 'Геозона',
      simulator: 'Симулятор',
      flightLog: 'Журнал польоту',
    },
  },
  planning: {
    editOnMap: 'Редагувати на карті',
    loadFromVehicle: 'Завантажити з борту',
    clear: 'Очистити',
    uploadToVehicle: 'Завантажити на борт',
    removeFromVehicle: 'Видалити з борту',
    upload: {
      pending: 'Завантаження…',
      accepted: 'Прийнято бортом',
      rejected: (reason) => `Відхилено: ${reason}`,
      rejectedByVehicle: 'Відхилено бортом',
      noResponse: 'Борт не відповідає',
    },
    mission: {
      editHint: 'Клацніть на карті, щоб додати точку; перетягніть номер, щоб її перемістити.',
      empty: 'Точок ще немає. Завантажте місію з борту або додайте точки на карті.',
      listLabel: 'Точки маршруту',
      shortName: 'Т',
      moveUp: (number) => `Перемістити точку ${String(number)} вгору`,
      moveDown: (number) => `Перемістити точку ${String(number)} вниз`,
      remove: (number) => `Видалити точку ${String(number)}`,
      draftMarker: (number) => `Нова точка маршруту ${String(number)}`,
      problems: 'Проблеми місії',
      route: (distance) => `Маршрут ${distance} від точки старту й назад`,
      waitingForVehicle: 'Очікування місії з борту',
      onVehicle: (missionId, waypoints, activeWaypoint) =>
        `Місія ${String(missionId)} на борту: ${count(waypoints, POINTS)}${
          activeWaypoint === null ? '' : `, летить до точки ${String(activeWaypoint)}`
        }`,
    },
    geofence: {
      editHint: 'Клацніть на карті, щоб додати вершину; перетягніть квадрат, щоб її перемістити.',
      empty: 'Вершин ще немає. Завантажте геозону з борту або додайте точки на карті.',
      listLabel: 'Вершини геозони',
      shortName: 'В',
      moveUp: (number) => `Перемістити вершину ${String(number)} вгору`,
      moveDown: (number) => `Перемістити вершину ${String(number)} вниз`,
      remove: (number) => `Видалити вершину ${String(number)}`,
      draftMarker: (number) => `Нова вершина геозони ${String(number)}`,
      problems: 'Проблеми геозони',
      waitingForVehicle: 'Очікування геозони з борту',
      noneOnVehicle: 'На борту немає геозони',
      onVehicle: (vertices) => `Геозона на борту: ${count(vertices, VERTICES)}`,
      waypointsOutside: (waypoints) =>
        `${count(waypoints, POINTS)} місії на борту поза цією геозоною. Перетнувши межу, апарат повернеться на точку старту.`,
    },
  },
  planIssues: {
    noWaypoints: 'Додайте хоча б одну точку маршруту',
    tooManyWaypoints: (max) => `Не більше ${count(max, POINTS_GENITIVE)} маршруту`,
    waypointTooFar: (number, kilometers) =>
      `Точка ${String(number)} далі ніж за ${String(kilometers)} км від точки старту`,
    waypointOutsideGeofence: (number) => `Точка ${String(number)} поза геозоною`,
    tooFewVertices: (min) => `Додайте щонайменше ${count(min, VERTICES_ACCUSATIVE)}`,
    tooManyVertices: (max) => `Не більше ${count(max, VERTICES_GENITIVE)}`,
    homeOutsideGeofence: 'Точка старту має бути всередині геозони',
    waitingForHome: 'Очікування точки старту',
  },
  faults: {
    note: 'Ці кнопки змінюють симуляцію, а не апарат. Так можна побачити, як станція реагує на збої.',
    linkLoss: 'Розірвати зв’язок на 10 с',
    gpsLoss: 'Втратити GPS на 15 с',
    batteryDrop: 'Розрядити батарею до 32%',
    started: (fault) => `Запущено: ${fault}`,
    failed: (fault) => `Не вдалося: ${fault}`,
  },
  flightLog: {
    note: (minutes) =>
      `Станція записує останні ${count(minutes, { one: 'хвилину', few: 'хвилини', many: 'хвилин', other: 'хвилини' })} телеметрії, як бортовий самописець.`,
    recorded: (duration) => `Записано ${duration}`,
    replayRecording: 'Відтворити запис',
    download: 'Зберегти журнал',
    open: 'Відкрити журнал польоту',
    fileError: (fileName, error) => `${fileName}: ${error}`,
    recordingSource: 'Запис цього сеансу',
    errors: {
      tooLarge: (megabytes) => `Файл більший за ${String(megabytes)} МБ.`,
      notJson: 'Файл не є коректним JSON.',
      notFlightLog: 'Це не журнал польоту Mini GCS.',
      invalid: 'Журнал пошкоджено або збережено непідтримуваною версією.',
    },
    title: 'Журнал польоту',
    source: 'Джерело',
    saved: 'Збережено',
    length: 'Тривалість',
    messages: 'Повідомлень',
    commandsUnavailable: 'Під час відтворення польоту команди недоступні.',
  },
  replay: {
    status: 'Відтворення',
    backToLive: 'Повернутися до польоту',
    title: 'Відтворення польоту',
    play: 'Відтворити',
    pause: 'Пауза',
    back: (seconds) => `Назад ${String(seconds)} с`,
    forward: (seconds) => `Вперед ${String(seconds)} с`,
    speed: 'Швидкість',
    position: 'Позиція відтворення',
    positionOf: (position, duration) => `${position} з ${duration}`,
    noLink: 'Немає зв’язку',
  },
}
