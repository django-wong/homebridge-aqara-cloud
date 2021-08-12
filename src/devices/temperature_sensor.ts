import { Characteristic } from "homebridge";
import Device, { ResourceMapping } from "../device";

export default class TemperatureSensor extends Device {
    public initState() {}

    getTemperatureResourceID() {
        return '0.1.85';
    }

    protected statusTamperedCharacteristic?: Characteristic;

    get abilities(): ResourceMapping[] {
        return [
            {
                service: this.Service.TemperatureSensor,
                characteristics: [
                    {
                        characteristic: this.Characteristic.CurrentTemperature,
                        resource: {
                            id: this.getTemperatureResourceID(),
                            getter: (options, value) => {
                                const t = parseFloat(value ?? '');
                                return Number.isNaN(t) ? null : t * 0.01;
                            }
                        }
                    }
                ]
            },
        ];
    }
}
