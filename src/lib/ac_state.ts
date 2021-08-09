import {Nullable} from "hap-nodejs";
import { Characteristic, CharacteristicValue } from "homebridge";

export default class AcState {
    // Thw raw data of the AC state
    private data = {};

    constructor(state: string) {
        state.split('_').forEach((part) => {
            const key = part.substr(0, 1); const value = parseInt(part.substr(1));
            this.data[key] = value;
        });
    }

    // 0 for swing and others stands for fixed
    get windDirection() {
        return this.data['D'] || 0;
    }

    set windDirection(value: number) {
        this.data['D'] = value;
    }

    // 0 = auto, 1 - low, 2 = medium, 3 = high
    get windSpeed() {
        return this.data['S'] || 0;
    }

    set windSpeed(value: number) {
        this.data['S'] = value;
    }

    // 0 = ON, 1 = OFF
    get power() {
        const value = this.data['P'];
        return  value == undefined ? 1 : value;
    }

    set power(value: number) {
        this.data['P'] = value;
    }

    // 0 = cooling, 1: heating, 2 = auto, others are additional features and should be ignored
    get mode() {
        const value = this.data['M'];
        if (value == undefined || value > 2) {
            return 2;
        }
        return this.data['M'];
    }

    set mode(value: number) {
        this.data['M'] = value;
    }

    // Valid value should be in between 16-30
    get temperature(): number {
        return this.data['T'] || 26;
    }

    set temperature(value: number) {
        this.data['T'] = value;
    }

    toString() {
        return `P${this.power}_M${this.mode}_T${this.temperature}_S${this.windSpeed}_D${this.windDirection}`;
    }

    getCurrentHeatingCoolingState(): Nullable<number> {
        if (this.power == 1) {
            return 0 // OFF;
        }

        switch (this.mode) {
        case 0:
            return 2; // COOL;
        case 1:
            return 1; // HEAT;
        case 2: // AUTO
            return 1; // HEAT;
        default:
            return null;
        }
    }

    getTargetHeatingCoolingState(): Nullable<number> {
        if (this.power == 1) {
            return 0 // OFF;
        }

        switch (this.mode) {
        case 0:
            return 2; // COOL;
        case 1:
            return 1; // HEAT;
        case 2: // AUTO
            return 3; // AUTO;
        default:
            return 0;
        }
    }

    setTargetHeatingCoolingState(value: CharacteristicValue) {
        console.info(`Set target heating cooling state <${value}>`);
        switch (value) {
        case 0:
            this.power = 1;
            break;
        case 1:
            this.power = 0;
            this.mode = 1;
            break;
        case 2:
            this.power = 0;
            this.mode = 0
            break;
        case 3:
            this.power = 0;
            this.mode = 2;
            break;
        }
    }

    getCurrentTemperature() {
        return this.temperature;
    }

    getTargetTemperature() {
        return this.getCurrentTemperature();
    }

    setTargetTemperature(value: CharacteristicValue) {
        console.info(`Set target temperature <${value}>`);
        if (Number.isFinite(value) && (value <= 30 || value >= 16)) {
            this.temperature = Math.ceil(value as number);
        }
    }

    getFanSpeed() {
        switch (this.windSpeed) {
        case 0:
            return 50;
        case 1:
            return 30
        case 2:
            return 60;
        case 3:
            return 100;
        default:
            return 50;
        }
    }

    setFanSpeed(value: CharacteristicValue) {
        console.info(`Set fan speed <${value}>`);
        switch (true) {
        case value == 0:
            this.power = 1;
            break;
        case value <= 30:
            this.windSpeed = 1;
            break;
        case value >= 30 && value <= 60:
            this.windSpeed = 2;
            break;
        case value >= 60:
            this.windSpeed = 3;
            break;
        }
    }

    getSwingMode() {
        return this.windDirection > 0 ? 1 : 0;
    }

    setSwingMode(value: CharacteristicValue) {
        console.info(`Set swing mode <${value}>`);
        this.windDirection = value > 0 ? 1 : 0;
    }
}
