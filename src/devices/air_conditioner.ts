import Device from "../device";

export default class AirConditioner extends Device {
	initState(): Promise<void> {
		return Promise.resolve(undefined);
	}
}
