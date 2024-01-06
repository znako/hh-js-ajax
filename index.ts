interface ErrorType {
    message: string;
}

interface BeerData {
    id: number;
    name: string;
    tagline: string;
    first_brewed: string;
    description: string;
    image_url: string;
    abv: number;
    food_pairing: Array<string>;
}

function fetchData(
    beerName: string
): Promise<Array<BeerData>> | Promise<ErrorType> {
    return fetch(
        `https://api.punkapi.com/v2/beers?beer_name=${beerName}&per_page=10`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
        }
    ).then(
        (response) => {
            if (response.ok) {
                return response.json();
            }
            return Promise.reject({
                message: "Error: something went wrong",
            });
        },
        () => {
            return Promise.reject({ message: "Error: Connection error" });
        }
    );
}

const errorOutput = document.getElementById("error") as HTMLDivElement;
const inputElement = document.getElementById("beer") as HTMLInputElement;
const suggestDiv = document.getElementById("suggest") as HTMLDivElement;
const resultDiv = document.getElementById("result") as HTMLDivElement;
const beerImage = document.getElementById("beerImage") as HTMLImageElement;
const beerName = document.getElementById("beerName") as HTMLSpanElement;
const beerTags = document.getElementById("beerTags") as HTMLSpanElement;
const beerFirstBrewed = document.getElementById(
    "beerFirstBrewed"
) as HTMLSpanElement;
const beerAbv = document.getElementById("beerAbv") as HTMLSpanElement;
const beerFoodPairing = document.getElementById(
    "beerFoodPairing"
) as HTMLSpanElement;
const beerDescription = document.getElementById(
    "beerDescription"
) as HTMLSpanElement;

const showResult = (beer: BeerData) => () => {
    beerImage.src = beer.image_url;
    beerImage.alt = beer.name;
    beerName.textContent = beer.name;
    beerTags.textContent = beer.tagline;
    beerFirstBrewed.textContent = beer.first_brewed;
    beerAbv.textContent = String(beer.abv);
    beerFoodPairing.textContent = beer.food_pairing.join(", ");
    beerDescription.textContent = beer.description;
    resultDiv.style.visibility = "visible";
};

inputElement.oninput = async (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    errorOutput.textContent = "";

    if (event.target.value) {
        try {
            const response = (await fetchData(
                event.target.value
            )) as Array<BeerData>;
            console.log(response);

            suggestDiv.innerHTML = "";
            response.forEach((beer) => {
                const pTag = document.createElement("p");
                pTag.textContent = beer.name;
                pTag.onclick = showResult(beer);
                suggestDiv.appendChild(pTag);
            });
        } catch (error) {
            const { message } = error as ErrorType;
            console.log("ERROR", message);
            errorOutput.textContent = message;
        }
    } else {
        suggestDiv.innerHTML = "";
    }
};
