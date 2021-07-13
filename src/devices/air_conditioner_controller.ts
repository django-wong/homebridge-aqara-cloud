import { Nullable } from 'hap-nodejs';
import Device, { ResourceMapping } from '../device';

type GeneralACState = {
	power: Nullable<number>,
	mode: Nullable<number>,
	temperature: Nullable<number>,
	windSpeed: Nullable<number>,
	light: Nullable<number>,
	windDirection: Nullable<number>
};

export default class AirConditionerController extends Device {
	public state = 'Px_Mm_Ty_Ss_Dd';

	static parseState(state: string): GeneralACState {
		const result: GeneralACState = {
			power: null,
			mode: null,
			temperature: null,
			windSpeed: null,
			light: null,
			windDirection: null
		};

		const parts = state.split('_');
		for (const data of parts) {
			const t = data.substr(0, 1);
			const v = parseInt(data.substr(1));

			switch (t) {
				case 'P':
					result.power = v;
					break;
				case 'M':
					result.mode = v;
					break;
				case 'T':
					result.temperature = v;
					break;
				case 'S':
					result.windSpeed = v;
					break;
				case 'D':
					result.windDirection = v;
					break;
				case 'L':
					result.light = v;
					break;
			}
		}

		return result;
	}

	static stringifyState(state: GeneralACState) {
		const values = [
			{
				type: 'power',
				value: state.power,
				text: `P${state.power}`
			},
			{
				type: 'mode',
				value: state.mode,
				text: `M${state.mode}`
			},
			{
				type: 'temperature',
				value: state.temperature,
				text: `T${state.temperature}`
			},
			{
				type: 'windSpeed',
				value: state.windSpeed,
				text: `S${state.windSpeed}`
			},
			{
				type: 'windDirection',
				value: state.windDirection,
				text: `D${state.windDirection}`
			},
			{
				type: 'light',
				value: state.light,
				text: `L${state.light}`
			}
		];

		return values.filter((item) => item.value != null).map((item) => item.text).join('_');
	}

	get abilities(): ResourceMapping[] {
		return [
			{
				service: this.Service.Thermostat,
				characteristics: [
					{
						characteristic: this.Characteristic.CurrentHeatingCoolingState,
						resource: {
							id: '8.0.2116',
							getter: (aqaraValue) => {
								if (aqaraValue != null) {
									let state = AirConditionerController.parseState(aqaraValue);
									if (state.power == 0) {
										return this.Characteristic.CurrentHeatingCoolingState.OFF;
									}
									switch (state.mode) {
										case 0:
											return 2;
										case 1:
											return 1;
										case 2:
											return 1;
									}
								}
								return null;
							},
							setter: (homebridgeValue) => {
								switch (homebridgeValue) {
									case 0:
										// OFF
									case 1:
										// HEAT
									case 2:
										// COOL
									case 3:
										// AUTO
								}

								return [null, 'ok'];
							}
						}
					}
				]
			},
			{
				service: this.Service.TemperatureSensor,
				characteristics: [
					{
						characteristic: this.Characteristic.CurrentTemperature,
						resource: {
							id: '0.1.85',
							getter(aqaraValue) {
								return Math.ceil(parseFloat(aqaraValue ?? '') / 100);
							}
						}
					}
				]
			},
			{
				service: this.Service.HumiditySensor,
				characteristics: [
					{
						characteristic: this.Characteristic.CurrentRelativeHumidity,
						resource: {
							id: '0.2.85',
							getter(aqaraValue) {
								return Math.ceil(parseFloat(aqaraValue ?? '') / 100);
							}
						}
					}
				]
			}
		];
	}
}
