const form = document.querySelector("form");

const input = document.querySelector("input");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    location.replace(`${input.value}`);
});