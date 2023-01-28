import { StorageSection } from './converterClasses2Storage';
export declare const convertStorages2Dot: (storages: StorageSection[], options: {
    data: boolean;
}) => string;
export declare function convertStorage2Dot(storage: StorageSection, dotString: string, options: {
    data: boolean;
}): string;
