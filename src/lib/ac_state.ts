import { CharacteristicValue, Nullable } from "homebridge";
import Device from "../device";

enum Mode {
    Cooling = 0, Heating = 1, Auto = 2, Other = 3
}

enum Power {
    On = 0, Off = 1
}

enum WindSpeed {
    Auto = 0, Low = 1, Medium = 2, High = 3
}

enum WindDirection {
    Swing = 0, Fixed = 1
}

export default class AcState {
    // The raw data of the AC state
    private data = {};

    constructor(private state: string, private device: Device) {
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

    getCurrentHeatingCoolingState(): Nullable<number> {
        if (this.power == Power.Off) {
            return this.C.CurrentHeatingCoolingState.OFF;
        }

        switch (this.mode) {
        case Mode.Cooling:
            return this.C.CurrentHeatingCoolingState.COOL
        case Mode.Heating:
            return this.C.CurrentHeatingCoolingState.HEAT
        case Mode.Auto: // TODO: Find out a better way to handle Auto
            return this.C.CurrentHeatingCoolingState.HEAT;
        default:
            return this.C.CurrentHeatingCoolingState.OFF;
        }
    }

    getTargetHeatingCoolingState(): Nullable<number> {
        if (this.power == Power.Off) {
            return this.C.TargetHeatingCoolingState.OFF;
        }

        switch (this.mode) {
        case Mode.Cooling:
            return this.C.TargetHeatingCoolingState.COOL;
        case Mode.Heating:
            return this.C.TargetHeatingCoolingState.HEAT;
        case Mode.Auto: // AUTO
            return this.C.TargetHeatingCoolingState.AUTO;
        default:
            return this.C.TargetHeatingCoolingState.COOL;
        }
    }

    setTargetHeatingCoolingState(value: CharacteristicValue) {
        switch (value) {
        case this.C.TargetHeatingCoolingState.OFF:
            this.power = Power.Off;
            break;
        case this.C.TargetHeatingCoolingState.HEAT:
            this.power = Power.On;
            this.mode = Mode.Heating;
            break;
        case this.C.TargetHeatingCoolingState.COOL:
            this.power = Power.On;
            this.mode = Mode.Cooling;
            break;
        case this.C.TargetHeatingCoolingState.AUTO:
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
        console.info(`Set target temperature <${value}>`);
        if (Number.isFinite(value) && (value <= 30 || value >= 16)) {
            this.temperature = Math.ceil(value as number);
        }
    }

    getFanSpeed() {
        switch (this.windSpeed) {
        case WindSpeed.Auto:
            return 50;
        case WindSpeed.Low:
            return 30
        case WindSpeed.Medium:
            return 60;
        case WindSpeed.High:
            return 100;
        default:
            return 50;
        }
    }

    setFanSpeed(value: CharacteristicValue) {
        console.info(`Set fan speed <${value}>`);
        switch (true) {
        case value == 0:
            this.power = Power.Off;
            this.windSpeed = WindSpeed.Auto;
            break;
        case value <= 30:
            this.windSpeed = WindSpeed.Low;
            break;
        case value >= 30 && value <= 60:
            this.windSpeed = WindSpeed.Medium;
            break;
        case value >= 60:
            this.windSpeed = WindSpeed.High;
            break;
        }
    }

    getSwingMode() {
        return this.windDirection > 0 ? this.C.SwingMode.SWING_ENABLED : this.C.SwingMode.SWING_DISABLED;
    }

    setSwingMode(value: CharacteristicValue) {
        this.windDirection = value > 0 ? WindDirection.Fixed : WindDirection.Swing;
    }
}
