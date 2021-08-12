import { ResourceMapping } from "../device";
import IRDevice from "./ir_device";
import { throttle } from 'lodash';
import { Characteristic } from 'homebridge';



export default class IRFan extends IRDevice {

    public active = this.Characteristic.Active.INACTIVE;
    public swing = this.Characteristic.SwingMode.SWING_DISABLED;

    protected swingModeCharacteristic?: Characteristic;

    get abilities(): ResourceMapping[] {
        return [
            {
                service: this.Service.Fanv2,
                characteristics: [
                    // Required characteristics
                    {
                        characteristic: this.Characteristic.Active,
                        resource: {
                            getter: () => this.active,
                            setter: async (options) => {
                                if (this.active != options.value) {
                                    this.active = options.value as number;
                                    await this.pressKeyByName('POWER');
                                    if (!this.active) {
                                        this.swing = this.Characteristic.SwingMode.SWING_DISABLED;
                                        this.swingModeCharacteristic?.updateValue(
                                            this.swing
                                        )
                                    }
                                }
                                return this.active;
                            }
                        }
                    },

                    {
                        characteristic: this.Characteristic.CurrentFanState,
                        resource: {
                            getter: () => {
                                return this.active
                                ? this.Characteristic.CurrentFanState.BLOWING_AIR
                                : this.Characteristic.CurrentFanState.INACTIVE;
                            }
                        }
                    },

                    // Optional characteristics
                    {
                        characteristic: this.Characteristic.SwingMode,
                        resource: {
                            getter: () => this.swing,
                            setter: async (options) => {
                                this.swing = options.value as number;
                                await this.pressKeyByName('SWING')
                                return this.swing;
                            },
                        },
                        onCreate: (characteristic) => this.swingModeCharacteristic = characteristic
                    },

                    {
                        characteristic: this.Characteristic.RotationSpeed,
                        resource: {
                            getter: () => 50,
                            setter: (options) => {
                                this.changeFanSpeed();
                                return options.value;
                            }
                        }
                    }
                ]
            }
        ];
    }

    private changeFanSpeed = throttle(() => this.pressKeyByName('FAN_SPEED'), 500);
}
