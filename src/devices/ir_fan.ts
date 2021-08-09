import { ResourceMapping } from "../device";
import IRDevice from "./ir_device";

export default class IRFan extends IRDevice {

    public active = this.Characteristic.Active.INACTIVE;
    public swing = this.Characteristic.SwingMode.SWING_DISABLED;

    get abilities(): ResourceMapping[] {
        return [
            {
                service: this.Service.Fanv2,
                characteristics: [
                    // Required characteristics
                    {
                        characteristic: this.Characteristic.Active,
                        resource: {
                            getter: () => {
                                return this.active;
                            },
                            setter: async (options) => {
                                if (this.active != options.value) {
                                    this.active = options.value as number;
                                    await this.pressKeyByName('POWER');
                                }
                                return this.active;
                            }
                        }
                    },

                    {
                        characteristic: this.Characteristic.CurrentFanState,
                        resource: {
                            getter: () => {
                                return this.active ? this.Characteristic.CurrentFanState.BLOWING_AIR : this.Characteristic.CurrentFanState.IDLE;
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
                            }
                        }
                    }
                ]
            }
        ];
    }
}
