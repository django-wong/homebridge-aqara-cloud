import {Nullable} from "hap-nodejs";
import { Characteristic, CharacteristicValue } from "homebridge";

export default class AcState {
    // protected windDirection: number = 0
    // protected windSpeed: number = 0;
    // protected power: number = 0;
    // protected temperature: number = 0;
    // protected mode: number = 0;

    protected data = {

    };

    constructor(state: string) {
        state.split('_').forEach((part) => {
            const key = part.substr(0, 1); const value = parseInt(part.substr(1));
            this.data[key] = value;
        });
    }

    toString() {
        return Object.keys(this.data).reduce<String[]>((initialValue, key) => {
            initialValue.push(`${key}${this.data[key]}`);
            return initialValue;
        }, []).join('_');
    }

    getCurrentHeatingCoolingState(): Nullable<number> {
        if (this.data['P'] == 1) {
            return 0 // OFF;
        }

        switch (this.data['M']) {
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
        if (this.data['P'] == 1) {
            return 0 // OFF;
        }

        switch (this.data['M']) {
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
        switch (value) {
        case 0:
            this.data['P'] = 1;
            break;
        case 1:
            this.data['P'] = 0;
            this.data['M'] = 1;
            break;
        case 2:
            this.data['P'] = 0;
            this.data['M'] = 0
            break;
        case 3:
            this.data['P'] = 0;
            this.data['M'] = 2;
            break;
        }
    }

    getCurrentTemperature() {
        return this.data['T'];
    }

    getTargetTemperature() {
        return this.getCurrentTemperature();
    }

    setTargetTemperature(value: CharacteristicValue) {
        if (Number.isFinite(value)) {
            this.data['T'] = Math.ceil(value as number);
        }
    }

    getFanSpeed() {
        return this.data['S'];
    }

    setFanSpeed(value: CharacteristicValue) {
        this.data['S'] = value;
    }
}
