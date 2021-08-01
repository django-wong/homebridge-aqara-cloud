import { stat } from 'fs';
import { Nullable } from 'homebridge';
import Device, {
    CharacteristicAndResourceMapping,
    CharacteristicValueGetterOptions,
    CharacteristicValueSetterOptions,
    ResourceMapping
} from '../device';
import AirConditioner from './air_conditioner';

type GeneralACState = {
    power: Nullable<number>
    mode: Nullable<number>
    temperature: Nullable<number>
    windSpeed: Nullable<number>
    light: Nullable<number>
    windDirection: Nullable<number>
};

export default class AirConditionerController extends Device {
    public state = {
        value: 'Px_Mm_Ty_Ss_Dd'
    };

    static parseState(state: string): GeneralACState {
        const result: GeneralACState = {
            power: null, mode: null, temperature: null, windSpeed: null, light: null, windDirection: null
        };

        const parts = state.split('_');
        for (const data of parts) {
            const v = parseInt(data.substr(1));
            switch (data.substr(0, 1)) {
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

    private createHeaterCoolerService() {
        return {
            service: this.Service.Thermostat,
            characteristics: [
                {
                    characteristic: this.Characteristic.CurrentHeatingCoolingState,
                    resource: {
                        id: '8.0.2116',
                        getter: (o, value) => this.readCurrentHeatingCoolingState(o, value)
                    }
                },
                {
                    characteristic: this.Characteristic.CurrentTemperature,
                    resource: {
                        id: '8.0.2116',
                        getter: (o) => this.readCurrentTemperature(o)
                    }
                },
                {
                    characteristic: this.Characteristic.TemperatureDisplayUnits,
                    resource: {
                        id: '8.0.2116',
                        getter: (o) => this.readTemperatureDisplayUnit(o)
                    }
                },
                {
                    characteristic: this.Characteristic.TargetHeatingCoolingState,
                    resource: {
                        id: '8.0.2116',
                        getter: (o) => this.readTargetCoolingState(o),
                        setter: (o) => this.setTargetHeatingCoolingState(o)
                    }
                },
                {
                    characteristic: this.Characteristic.TargetTemperature,
                    resource: {
                        id: '8.0.2116',
                        getter: (o) => this.readTargetTemperature(o),
                        setter: (o) => this.setTargetGTemperature(o)
                    }
                }
            ]
        }
    }

    get abilities(): ResourceMapping[] {
        return [
            this.createHeaterCoolerService(),
            {
                service: this.Service.TemperatureSensor,
                characteristics: [
                    {
                        characteristic: this.Characteristic.CurrentTemperature,
                        resource: {
                            id: '0.1.85',
                            getter: (o, value) => this.readSensorTemperature(o, value)
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
                            getter: (o, value) => this.readSensorRelativeHumidity(o, value)
                        }
                    }
                ]
            }
        ];
    }

    initState(): Promise<void> {
        return Promise.resolve(undefined);
    }

    async readSensorRelativeHumidity(options: CharacteristicValueGetterOptions, value?: string) {
        if (value != null && value) {
            return Math.ceil(parseFloat(value) / 100);
        }

        return null;
    }

    async readSensorTemperature(options: CharacteristicValueGetterOptions, value?: string) {
        if (value != null && value) {
            return Math.ceil(parseFloat(value) / 100);
        }
        return null;
    }

    async readTargetTemperature(options: CharacteristicValueGetterOptions) {
        let value = await this.resource.read(
            options.configuration.resource.id!
        );

        if (!value) {
            return null;
        }

        return AirConditionerController.parseState(value || '').temperature;
    }

    async readTargetCoolingState(options: CharacteristicValueGetterOptions) {
        let value = await this.resource.read(
            options.configuration.resource.id!
        );

        if (!value) {
            return null;
        }

        let state = AirConditionerController.parseState(value);

        if (state.power == 1) {
            return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }

        switch (state.mode) {
        case 0:
            return this.Characteristic.TargetHeatingCoolingState.COOL;
        case 1:
            return this.Characteristic.TargetHeatingCoolingState.HEAT;
        case 2:
            return this.Characteristic.TargetHeatingCoolingState.AUTO;
        default:
            return null;
        }
    }

    async setTargetGTemperature(options: CharacteristicValueSetterOptions) {
        return options.value;
    }

    async setTargetHeatingCoolingState(options: CharacteristicValueSetterOptions) {
        return options.value;
    }

    async readTemperatureDisplayUnit(options: CharacteristicValueGetterOptions) {
        return this.Characteristic.TemperatureDisplayUnits.CELSIUS;
    }

    async readCurrentTemperature(options: CharacteristicValueGetterOptions) {
        let value = await this.resource.read(
            options.configuration.resource.id!
        )
        return AirConditionerController.parseState(value || '').temperature;
    }

    async readCurrentHeatingCoolingState(options: CharacteristicValueGetterOptions, value?: string) {
        let state = AirConditionerController.parseState(value || '');

        if (state.power == 1) {
            return this.Characteristic.CurrentHeatingCoolingState.OFF;
        }

        switch (state.mode) {
        case 0:
            return this.Characteristic.CurrentHeatingCoolingState.COOL;
        case 1:
            return this.Characteristic.CurrentHeatingCoolingState.HEAT;
        case 2:
            return this.Characteristic.CurrentHeatingCoolingState.HEAT;
        default:
            return null;
        }
    }
}
