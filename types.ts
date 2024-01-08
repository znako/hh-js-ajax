export interface ErrorType {
    message: string;
}

export interface BeerData {
    id: number;
    name: string;
    tagline: string;
    first_brewed: string;
    description: string;
    image_url: string | null;
    abv: number;
    food_pairing: Array<string>;
}
