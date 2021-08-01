import AirConditionerController from '../src/devices/air_conditioner_controller';
import AcState from '../src/lib/ac_state';

const data = 'P1_M0_T27_S2_D3_L4';

test('data parse', () => {
    const result = AirConditionerController.parseState(data);
    expect(result.temperature).toBe(27);
    expect(result.windSpeed).toBe(2);
});


test('ac state', () => {
    const acstate = new AcState('P0_M0_T26_S0')
    expect(acstate.getCurrentTemperature()).toBe(26);
    expect(acstate.getCurrentHeatingCoolingState()).toBe(2);
})
