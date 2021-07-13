import AirConditionerController from '../src/devices/air_conditioner_controller';

const data = 'P1_M0_T27_S2_D3_L4';

test('data parse', () => {
	const result = AirConditionerController.parseState(data);
	console.info(result);
});
