import { ResourceValue } from "../device";

export type ResourcesValue = Intent['query']['resource']['value']['response'];

export default class ResourceState {
    constructor(private state: ResourcesValue = []) {

    }

    overwrite(state: ResourcesValue) {
        this.state = state;
    }

    find(resourceId: string) {
        return this.state.find((resource) => resource.resourceId == resourceId);
    }

    read(resourceId: string, fallback?: string): ResourceValue {
        let resource = this.find(resourceId);
        if (resource == undefined || resource.value == undefined) {
            return fallback ?? undefined;
        }
        return resource.value;
    }

    write(resourceId: string, value: string) {
        let resource = this.find(resourceId);
        if (resource == undefined) {
            throw new Error(`Can not find resource <${resourceId}>`);
        }
        resource.value = value;
    }
}
