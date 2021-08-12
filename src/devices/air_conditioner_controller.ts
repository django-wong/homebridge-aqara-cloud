import AirConditioner from './air_conditioner';
import TemperatureSensor from './temperature_sensor';

export default class AirConditionerController extends TemperatureSensor {
    getTemperatureResourceID() {
        return '0.1.85';
    }
}
