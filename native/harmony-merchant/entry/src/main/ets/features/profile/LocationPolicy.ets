export class LocationPolicy {
  static isValidCoordinate(latitude: number, longitude: number): boolean {
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  static acceptsEpoch(expected: number, current: number): boolean {
    return expected === current;
  }

  static joinRegion(administrativeArea: string, locality: string, subLocality: string): string {
    return `${administrativeArea.trim()}${locality.trim()}${subLocality.trim()}`;
  }

  static selectedAddress(name: string, address: string): string {
    return [name.trim(), address.trim()].filter((value: string): boolean => value.length > 0).join(' · ');
  }

  static coordinateLabel(latitude: number, longitude: number, label: string): string {
    const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    return `${label.trim()} ${coordinates}`;
  }
}
