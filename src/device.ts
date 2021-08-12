import EventEmitter from 'events';
import { Characteristic, CharacteristicChange, CharacteristicValue, Nullable, PlatformAccessory, Service, WithUUID } from 'homebridge';

import ResourcesValue from "./lib/resource_state";


import AqaraCloudPlatform from './platform';

type PromiseOr<T> = Promise<T> | T;

type CharacteristicGetResult = PromiseOr<Nullable<CharacteristicValue>>

type CharacteristicSetResult = PromiseOr<Nullable<CharacteristicValue> | void>

export type CharacteristicValueGetterOptions = {
    configuration: CharacteristicAndResourceMapping,
    context: any,
    connection: HAPConnection
}

export type CharacteristicValueSetterOptions = {
    value: CharacteristicValue
} & CharacteristicValueGetterOptions

type CharacteristicValueGetter = (options: CharacteristicValueGetterOptions, resourceValue?: string) => CharacteristicGetResult
type CharacteristicValueSetter = (options: CharacteristicValueSetterOptions) => CharacteristicSetResult

export type CharacteristicAndResourceMapping = {
    characteristic: WithUUID<{new (): Characteristic}>,
    resource: {
        id?: string, // The aqara resource ID
        getter?: CharacteristicValueGetter
        setter?: CharacteristicValueSetter
    },
    onCreate?: (characteristic: Characteristic) => void
}

export type ResourceMapping = {
    serviceSubType?: string
    serviceName?: string
    service: WithUUID<typeof Service>,
    characteristics: CharacteristicAndResourceMapping[],
    onCreate?: (service: Service) => void
}

type HAPConnection = CharacteristicChange['originator'];

export type AqaraAccessory = Intent['query']['device']['info']['response']['data'][0];

export type SubClassOfDevice = new (platform: AqaraCloudPlatform, accessory: PlatformAccessory<AqaraAccessory>) => Device

export type State<T extends PlainObject = Record<string, unknown>> = Record<string, unknown> & T

/**
 * The abstraction of a device. You should use other type of devices instead of this one.
 *
 * @class      Device (name)
 */
export default abstract class Device extends EventEmitter {
    public resource = new ResourcesValue([])

    public state: State = {}

    protected accessoryInformationService?: Service;

    constructor(public platform: AqaraCloudPlatform, public accessory: PlatformAccessory<AqaraAccessory & Record<string, any>>) {
        super();
        this.platform.log.info(`Initializing device<${this.accessory.context.deviceName}>...`)
        this.init().then(() => {
            this.platform.log.info(`Device<${this.accessory.context.deviceName}> initialized!`)
            setInterval(() => {
                this.pull().then(() => {
                    console.info(`Refresh state of device<${this.accessory.context.did}>`);
                })
            }, 30000);
        });
    }

    /**
     * You should not override this method or at least call `super.init()` if you insist
     * @protected
     */
    protected async init() {
        try {
            await this.initState();
            this.registerAccessoryInformation();
            this.registerServices();
        } catch (e) {
            this.platform.log.error('Error captured while initializing device');
            console.error(e);
        }
    }

    abstract initState(): PromiseOr<void>;

    /**
     * Alias to api.hap.Characteristic
     */
    get Characteristic() {
        return this.platform.Characteristic;
    }

    /**
     * Alias to api.hap.Service
     */
    get Service() {
        return this.platform.Service;
    }

    get manufacturer(): string {
        return 'Aqara';
    }

    get model(): string {
        return this.accessory.context.model;
    }

    get serialNumber(): string {
        return this.accessory.context.did;
    }

    get firmwareVersion(): string {
        return this.accessory.context.firmwareVersion || 'unknown';
    }


    private registerAccessoryInformation() {
        this.accessoryInformationService = this.accessory.getService(
            this.Service.AccessoryInformation
        )?.setCharacteristic(
            this.Characteristic.Manufacturer, this.manufacturer
        )?.setCharacteristic(
            this.Characteristic.Model, this.model
        )?.setCharacteristic(
            this.Characteristic.SerialNumber, this.serialNumber
        )?.setCharacteristic(
            this.Characteristic.FirmwareRevision, this.firmwareVersion
        )?.setCharacteristic(
            this.Characteristic.Name, this.accessory.context.deviceName
        )
    }

    /**
     * This method will be called to register this device in homebridge
     */
    private registerServices() {
        const abilities = this.abilities;
        abilities.forEach((ability) => {
            const service = this.createService(ability.service, ability.serviceName, ability.serviceSubType);
            if (service) {
                ability.onCreate && ability.onCreate(service);
                ability.characteristics.forEach((characteristic) => {
                    this.createCharacteristic(service, characteristic);
                });
            }
        });
    }

    /**
     * Creates a service.
     *
     * @param      {WithUUID<typeof Service>}  service  The service
     * @param serviceName
     * @param serviceSubStype
     */
    private createService(service: WithUUID<typeof Service>, serviceName?: string, serviceSubStype?: string) {
        let instance = this.accessory.getService(serviceName ? serviceName : service);
        if (instance == undefined) {
            instance = this.accessory.addService(service, serviceName, serviceSubStype);
        }
        this.platform.log.info(instance ? `Created new service: ${service.name}` : `Can not create service: ${service.name}`);
        return instance;
    }

    /**
     * Creates a characteristic.
     *
     * @param      {Service}                           service  The service
     * @param      {CharacteristicAndResourceMapping}  options  The options
     */
    private createCharacteristic(service: Service, options: CharacteristicAndResourceMapping) {
        const characteristic = service.getCharacteristic(options.characteristic)

        options.onCreate && options.onCreate(characteristic);

        // Bind the getter to characteristic
        if (typeof options.resource.getter == "function") {
            characteristic.onGet(async (context, connection?: HAPConnection) => {
                let cachedValue;
                if (options.resource.id) {
                    try {
                        cachedValue = this.resource.read(options.resource.id ?? '');
                    } catch (e) {
                        // Unable to find resource value from cache
                    }
                }

                const arg1 = {
                    context, connection, configuration: options,
                };

                return options.resource.getter!(arg1, cachedValue)
            })
        }

        // Bind the setter to characteristic
        if (typeof options.resource.setter == 'function') {
            characteristic.onSet(async (value: CharacteristicValue, context: any, connection?: HAPConnection) => {
                return options.resource.setter!({
                    value: value,
                    context,
                    connection,
                    configuration: options
                });
            });
        }
    }

    /**
     * Define the abilities of the accessory
     *
     * @type       {ResourceMapping[]}
     */
    get abilities(): ResourceMapping[] {
        return [];
    }

    /**
     * Get all registered resource id
     *
     * @type       {string[]}
     */
    get availableResourcesID(): string[] {
        const resources = new Set<string>();
        for (const service of this.abilities) {
            for (const characteristic of service.characteristics) {
                if (characteristic.resource.id) {
                    resources.add(characteristic.resource.id);
                }
            }
        }
        return Array.from(resources.values());
    }


    /**
     * Pulls the resources value from aqara cloud and cache it before next pull.
     */
    private async pull(){
        const resourcesID = this.availableResourcesID;

        if (resourcesID.length == 0) {
            return;
        }

        try {
            const response = await this.platform.aqaraApi.request<Intent['query']['resource']['value']>(
                "query.resource.value", {
                    "resources": [
                        {
                            "subjectId": this.accessory.context.did,
                            "resourceIds": resourcesID
                        }
                    ]
                }
            );

            if (Array.isArray(response.data.result)) {
                this.resource.overwrite(response.data.result);
            }
        } catch (e) {
            this.platform.log.error('Error captured on pull resource data from cloud');
            console.error(e);
        }
    }

    /**
     * Set resource value by write to Aqara cloud
     *
     * @param resourceId
     * @param value
     */
    async setResource(resourceId: string, value: string) {
        await this.platform.aqaraApi.request<Intent['write']['resource']['device']>(
            'write.resource.device', [{
            subjectId: this.accessory.context.did,
            resources: [
                {
                    resourceId, value
                }
            ]
        }]);

        await this.pull();
    }
}
