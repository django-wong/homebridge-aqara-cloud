import Device from "../device";

export default class AirConditioner extends Device {
	/**
	 * Gets the temperature range.
	 *
	 * @return     {[number, number]}  The temperature range.
	 */
	getTemperatureRange(): [number, number] {
		return [10, 30];
	}
}