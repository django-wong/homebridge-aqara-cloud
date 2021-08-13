import { CharacteristicValue, Nullable } from "homebridge";
import Device from "../device";

export enum Mode {
    Cooling = 0, Heating = 1, Auto = 2, Other = 3
}

export enum Power {
    On = 0, Off = 1
}

export enum WindSpeed {
    Auto = 0, Low = 1, Medium = 2, High = 3
}

export enum WindDirection {
    Swing = 0, Fixed = 1
}

export default class AcState {
    // The raw data of the AC state
    private data = {};

    constructor(public state: string, private device: Device) {
        state.split('_').forEach((part) => {
            const key = part.substr(0, 1); const value = parseInt(part.substr(1));
            this.data[key] = value;
        });
    }

    // 0 for swing and others stands for fixed
    get windDirection() {
        return this.data['D'] || WindDirection.Swing;
    }

    set windDirection(value: WindDirection) {
        this.data['D'] = value;
    }

    // 0 = auto, 1 - low, 2 = medium, 3 = high
    get windSpeed() {
        return this.data['S'] || WindSpeed.Auto;
    }

    set windSpeed(value: WindSpeed) {
        this.data['S'] = value;
    }

    // 0 = ON, 1 = OFF
    get power() {
        const value = this.data['P'];
        return  value == undefined ? Power.Off : value;
    }

    set power(value: Power) {
        this.data['P'] = value;
    }

    // 0 = cooling, 1: heating, 2 = auto, others are additional features and should be ignored
    get mode() {
        const value = this.data['M'];
        if (value == undefined || value > Mode.Auto) {
            return Mode.Auto;
        }
        return this.data['M'];
    }

    set mode(value: Mode) {
        this.device.platform.log.info(`Changing mode to ${value}`)

        if (value == Mode.Auto) {
            let lastModel: Mode = this.device.accessory.context['lastMode'];
            if (lastModel != undefined) {
                this.device.platform.log.info(`Alter auto mode to ${lastModel}`)
                value = lastModel
            }
        } else {
            this.device.accessory.context['lastMode'] = value;
        }
        this.data['M'] = value;
    }

    // Valid value should be in between 16-30
    get temperature(): number {
        return this.data['T'] || 26;
    }

    set temperature(value: number) {
        this.data['T'] = value;
    }

    get C() {
        return this.device.Characteristic;
    }

    toString() {
        return `P${this.power}_M${this.mode}_T${this.temperature}_S${this.windSpeed}_D${this.windDirection}`;
    }

    getCurrentHeaterCoolerState(): Nullable<number> {
        if (this.power == Power.Off) {
            return this.C.CurrentHeaterCoolerState.INACTIVE;
        }

        switch (this.mode) {
        case Mode.Cooling:
            return this.C.CurrentHeaterCoolerState.COOLING
        case Mode.Heating:
            return this.C.CurrentHeaterCoolerState.HEATING
        case Mode.Auto: // TODO: Find out a better way to handle Auto
            return this.C.CurrentHeaterCoolerState.HEATING;
        default:
            return this.C.CurrentHeaterCoolerState.INACTIVE;
        }
    }

    getTargetHeaterCoolerState(): Nullable<number> {
        switch (this.mode) {
        case Mode.Cooling:
            return this.C.TargetHeaterCoolerState.COOL;
        case Mode.Heating:
            return this.C.TargetHeaterCoolerState.HEAT;
        case Mode.Auto:
            return this.C.TargetHeaterCoolerState.AUTO;
        default:
            return this.C.TargetHeaterCoolerState.AUTO;
        }
    }

    setTargetHeaterCoolerState(value: CharacteristicValue) {
        switch (value) {
        case this.C.TargetHeaterCoolerState.HEAT:
            this.power = Power.On;
            this.mode = Mode.Heating;
            break;
        case this.C.TargetHeaterCoolerState.COOL:
            this.power = Power.On;
            this.mode = Mode.Cooling;
            break;
        case this.C.TargetHeaterCoolerState.AUTO:
            this.power = Power.On;
            this.mode = Mode.Auto;
            break;
        }
    }

    // Since there is no way to read the ambient temperature from an IR device, use the target temperature as a workaround...
    getCurrentTemperature() {
        return this.temperature;
    }

    getTargetTemperature() {
        return this.temperature;
    }

    setTargetTemperature(value: CharacteristicValue) {
        if (Number.isFinite(value) && (value <= 30 || value >= 16)) {
            this.temperature = Math.ceil(value as number);
        }
    }

    getFanSpeed() {
        if (this.power == Power.Off) {
            return 0;
        }

        switch (this.windSpeed) {
        case WindSpeed.Auto:
            return 30;
        case WindSpeed.Low:
            return 30
        case WindSpeed.Medium:
            return 60;
        case WindSpeed.High:
            return 100;
        default:
            return 30;
        }
    }

    setFanSpeed(value: CharacteristicValue) {
        switch (true) {
        case value == 0:
            this.windSpeed = WindSpeed.Auto;
            this.power = Power.Off;
            break;
        case value <= 30:
            this.windSpeed = WindSpeed.Low;
            break;
        case value > 30 && value <= 60:
            this.windSpeed = WindSpeed.Medium;
            break;
        case value > 60:
            this.windSpeed = WindSpeed.High;
            break;
        }
    }

    getSwingMode() {
        return this.windDirection == WindDirection.Swing
            ? this.C.SwingMode.SWING_ENABLED
            : this.C.SwingMode.SWING_DISABLED;
    }

    setSwingMode(value: CharacteristicValue) {
        this.windDirection = value == 0 ? WindDirection.Swing : WindDirection.Fixed;
    }

    getCurrentFanState() {
        return this.power == Power.On
            ? this.C.CurrentFanState.BLOWING_AIR
            : this.C.CurrentFanState.INACTIVE;
    }

    getActive() {
        return this.power == Power.On ? this.C.Active.ACTIVE : this.C.Active.INACTIVE;
    }

    setActive(value: CharacteristicValue) {
        this.power = value == this.C.Active.ACTIVE ? Power.On : Power.Off;
    }
}
