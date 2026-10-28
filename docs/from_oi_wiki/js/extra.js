const updateScheme = e => {
    var giscus = document.querySelector(".giscus-frame");
    var a = localStorage.getItem('data-md-color-scheme');
    var theme = a === "default" ? "light" : "dark";
    // alert(a + " -> " + theme);
    if (!giscus) return;
    giscus.contentWindow.postMessage(
        { giscus: { setConfig: { theme } } },
        "https://giscus.app"
    )
}

window.addEventListener('load', updateScheme, false);

const updateBoxFontColor = e => {
    var a = localStorage.getItem('data-md-color-scheme');
    if (a !== "default") {
        var elements = document.getElementsByClassName('box');
        for (var i in elements) {
            // alert(elements[i].style.color);
            elements[i].style.color = "white";
        }
    }
}

// Material owns the palette. Do not force a legacy localStorage theme here.
