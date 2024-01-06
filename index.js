"use strict";
function fetchData(beerName) {
    return fetch(`https://api.punkapi.com/v2/beers?beer_name=${beerName}&per_page=10`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
        redirect: "follow",
    }).then((response) => {
        if (response.ok) {
            return response.json();
        }
        return Promise.reject({
            message: "Error: something went wrong",
        });
    }, () => {
        return Promise.reject({ message: "Error: Connection error" });
    });
}
const errorOutput = document.getElementById("error");
const inputElement = document.getElementById("beer");
const suggestDiv = document.getElementById("suggest");
const resultDiv = document.getElementById("result");
const beerImage = document.getElementById("beerImage");
const beerName = document.getElementById("beerName");
const beerTags = document.getElementById("beerTags");
const beerFirstBrewed = document.getElementById("beerFirstBrewed");
const beerAbv = document.getElementById("beerAbv");
const beerFoodPairing = document.getElementById("beerFoodPairing");
const beerDescription = document.getElementById("beerDescription");
const showResult = (beer) => () => {
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
    if (!(event.target instanceof HTMLInputElement))
        return;
    errorOutput.textContent = "";
    if (event.target.value) {
        try {
            const response = (await fetchData(event.target.value));
            console.log(response);
            suggestDiv.innerHTML = "";
            response.forEach((beer) => {
                const pTag = document.createElement("p");
                pTag.textContent = beer.name;
                pTag.onclick = showResult(beer);
                suggestDiv.appendChild(pTag);
            });
        }
        catch (error) {
            const { message } = error;
            console.log("ERROR", message);
            errorOutput.textContent = message;
        }
    }
    else {
        suggestDiv.innerHTML = "";
    }
};
