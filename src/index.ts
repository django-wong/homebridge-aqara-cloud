import { API } from 'homebridge';
import Platform from "./platform";


export default function (api: API) {
	api.registerPlatform(Platform.pluginIdentifier, Platform.platformName, Platform);
}
