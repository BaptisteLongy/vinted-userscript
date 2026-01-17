// ==UserScript==
// @name         Vinted Update description Helper for Sonia
// @namespace    mailto:baptiste.longy@gmail.com
// @version      0.0.7
// @updateURL    https://github.com/BaptisteLongy/online-shopping-userscript/raw/refs/heads/master/vinted/update-description-sonia.user.js
// @downloadURL  https://github.com/BaptisteLongy/online-shopping-userscript/raw/refs/heads/master/vinted/update-description-sonia.user.js
// @description  Helper script to update descriptions on Vinted by adding/removing dashes in the description to trigger an update. Made for Sonia.
// @author       Baptiste Longy
// @match        https://www.vinted.fr/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vinted.fr
// @grant        GM_xmlhttpRequest
// @connect      www.vinted.fr
// @run-at       document-start
// ==/UserScript==

function getRandomInt(min, max) {
    const minCeiled = Math.ceil(min);
    const maxFloored = Math.floor(max);
    return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

async function gatherAllArticles() {
    const wardrobeEndpoint = `https://www.vinted.fr/api/v2/wardrobe/${document.URL.substring(document.URL.lastIndexOf('/') + 1)}/items`

    let page = 1;
    let response = await fetch(`${wardrobeEndpoint}?page=${page}`,
        {
            headers: {
                "Host": "www.vinted.fr",
                "Accept": "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "fr,*;q=0.5",
                "Connection": "keep-alive",
                "X-Requested-With": "XMLHttpRequest",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
            }
        })
    let data = await response.json();
    let totalPages = data.pagination.total_pages;

    // ----------------------------
    // Comment this to include all items
    let filteredItems = data.items.filter(item => !item.is_draft && !item.is_closed && !item.is_hidden && !item.is_reserved);
    // let filteredItems = data.items;
    // ----------------------------

    let fetchedWardrobeItems = [...filteredItems.map(item => item.id)];

    while (page !== totalPages) {
        page += 1;
        response = await fetch(`${wardrobeEndpoint}?page=${page}`,
            {
                headers: {
                    "Host": "www.vinted.fr",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "fr,*;q=0.5",
                    "Connection": "keep-alive",
                    "X-Requested-With": "XMLHttpRequest",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                }
            })
        data = await response.json();
        fetchedWardrobeItems = [...fetchedWardrobeItems, ...data.items.map(item => item.id)];
    }

    return fetchedWardrobeItems;
}

async function updateAllDescriptions() {
    const articles = await gatherAllArticles();
    if (articles.length === 0) return;

    // Save articles and current index to localStorage
    localStorage.setItem('vinted_articles_from_baptiste', JSON.stringify(articles));
    localStorage.setItem('vinted_index_from_baptiste', '0');
    localStorage.setItem('vinted_baptiste_is_updating_descriptions', true);

    navigateToNextArticle();
}

function navigateToNextArticle() {
    let articles = JSON.parse(localStorage.getItem('vinted_articles_from_baptiste') || '[]');
    let index = parseInt(localStorage.getItem('vinted_index_from_baptiste') || '-1');

    if (articles.length > 0 && index < articles.length && index >= 0) {
        setTimeout(
            () => {// Increment index for next navigation
                localStorage.setItem('vinted_index_from_baptiste', (index + 1).toString());
                // Navigate to the next article
                window.location.assign(`https://www.vinted.fr/items/${articles[index]}/edit`);
            }
            , index === 0 ? 0 : getRandomInt(3, 10) * 1000);
    } else {
        setTimeout(
            () => {
                // Cleanup when done
                localStorage.removeItem('vinted_articles_from_baptiste');
                localStorage.removeItem('vinted_index_from_baptiste');
                localStorage.removeItem('vinted_baptiste_is_updating_descriptions');
                alert("Baptiste a fini :)");
                const draftButton = document.querySelector('button[data-testid="closet-seller-filters-sold"]');
                addUpdateDescriptionButton(draftButton);
                removeVeil();
            }
            , 3000);
    }
}

function addUpdateDescriptionButton(draftButton) {
    let btn = document.createElement("button");
    btn.innerHTML = '<div class="web_ui__Chip__text"><span class="web_ui__Text__text web_ui__Text__subtitle web_ui__Text__left web_ui__Text__amplified web_ui__Text__truncated">MAJ Description</span></div>'
    btn.className = "web_ui__Chip__chip web_ui__Chip__outlined web_ui__Chip__round";
    btn.type = "button";
    btn.style.marginLeft = "5px";
    btn.onclick = () => {
        updateAllDescriptions();
    };

    draftButton.after(btn);
}

// Observe DOM changes and add buttons when their targets appear
function observeDraftButton() {
    const observer = new MutationObserver((mutations, obs) => {
        if (document.URL.includes("/member/")) {
            const draftButton = document.querySelector('button[data-testid="closet-seller-filters-sold"]');
            if (draftButton) {
                addUpdateDescriptionButton(draftButton);
                obs.disconnect(); // Stop observing after the button is found and handled
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function observeDescriptionField() {
    const observer = new MutationObserver((mutations, obs) => {
        if (document.URL.includes("/items/")
            && document.URL.includes("/edit")) {
            const descriptionField = document.querySelector('textarea[id="description"]');
            if (descriptionField) {
                changeDescription(descriptionField);
                obs.disconnect(); // Stop observing after the button is found and handled
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function changeDescription(descriptionField) {
    if (localStorage.getItem('vinted_baptiste_is_updating_descriptions')) {

        // Find the first substring of at least 3 consecutive '-' in the middle
        const dashMatch = descriptionField.value.match(/-{3,}/);
        console.log(dashMatch);
        if (dashMatch) {
            const dashStr = dashMatch[0];
            const dashCount = dashStr.length;

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value').set;

            if (dashCount <= 10) {
                // Add a '-' to the sequence
                const newDashStr = '-'.repeat(dashCount + 1);
                nativeInputValueSetter.call(descriptionField, descriptionField.value.replace(dashStr, newDashStr));
                descriptionField.dispatchEvent(new Event('input', { bubbles: true }))
            } else if (dashCount > 10) {
                // Remove one '-' from the sequence
                const newDashStr = '-'.repeat(dashCount - 1);
                nativeInputValueSetter.call(descriptionField, descriptionField.value.replace(dashStr, newDashStr));
                descriptionField.dispatchEvent(new Event('input', { bubbles: true }))
            }
        }

        // ----------------------------
        // Comment this to include all items
        const saveButton = document.querySelector('button[data-testid="upload-form-save-button"]');
        // const saveButton = document.querySelector('button[data-testid="upload-form-save-draft-button"]');
        // ----------------------------

        if (saveButton) {
            setTimeout(() => {
                saveButton.click();
            }, getRandomInt(5, 15) * 1000);
        }
    }
}


function addVeil() {
    const veil = document.createElement('div');
    veil.id = 'baptiste-veil';
    veil.style.position = 'fixed';
    veil.style.top = '0';
    veil.style.left = '0';
    veil.style.width = '100%';
    veil.style.height = '100%';
    veil.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    veil.style.zIndex = '9999';
    document.body.appendChild(veil);
}

function removeVeil() {
    const veil = document.getElementById('baptiste-veil');
    if (veil) {
        veil.remove();
    }
}

(function () {
    'use strict';

    // If there is a navigation in progress, continue
    if (localStorage.getItem('vinted_baptiste_is_updating_descriptions')
        && document.URL.includes("/items/")
        && document.URL.includes("/edit")) {
        addVeil();
        observeDescriptionField();
    } else if (localStorage.getItem('vinted_baptiste_is_updating_descriptions')) {
        addVeil();
        navigateToNextArticle();
    } else {
        observeDraftButton();
    }
})();