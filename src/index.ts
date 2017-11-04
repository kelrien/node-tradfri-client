// Reflect-polyfill laden
// tslint:disable-next-line:no-var-requires
require("reflect-metadata");

export { Accessory, AccessoryTypes } from "./lib/accessory";
export { DeviceInfo, PowerSources } from "./lib/deviceInfo";
export { GatewayDetails } from "./lib/gatewayDetails";
export { Group, GroupInfo, GroupOperation } from "./lib/group";
export { IPSODevice } from "./lib/ipsoDevice";
export { Light, LightOperation, Spectrum } from "./lib/light";
export { LightSetting } from "./lib/lightSetting";
export { Notification, NotificationTypes } from "./lib/notification";
export { Plug } from "./lib/plug";
export { Scene } from "./lib/scene";
export { Sensor } from "./lib/sensor";
export { TradfriError, TradfriErrorCodes } from "./lib/tradfri-error";
export {
	DeviceRemovedCallback, DeviceUpdatedCallback,
	ErrorCallback,
	GroupRemovedCallback, GroupUpdatedCallback,
	ObserveDevicesCallback, ObserveResourceCallback,
	SceneRemovedCallback, SceneUpdatedCallback,
	TradfriClient,
} from "./tradfri-client";
