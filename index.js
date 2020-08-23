// @ts-check
const puppeteer = require('puppeteer');
const fs = require('fs');

// document.querySelector('.search-result-content ul.search-result-items').children.length
(async () => {
    let items = [];

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://cottonon.com/ZA/sale/sale-mens/');
    await page.waitForSelector('.search-result-content');

    const getItemDescription = (page, selector) =>
        page.evaluate(
            selector => document.querySelector(selector).innerText,
            selector
        );

    const getAttributeLink = (page, selector, att) => {
        switch (att) {

            case 'src':
                return page.evaluate(
                    (selector, att) => document.querySelector(selector).getAttribute('src'),
                    selector
                );

            case 'href':
                return page.evaluate(
                    (selector) => document.querySelector(selector).getAttribute('href'),
                    selector
                );

            case 'data-itemid':
                return page.evaluate(
                    (selector) => document.querySelector(selector).getAttribute('data-itemid'),
                    selector
                );
            default:
                return null
        }
    };

    const result = await page.evaluate(async () => {
        // const items = await document.querySelectorAll(".search-result-content ul .product-name").forEach(item => item.innerText);
        // const items = document.querySelector('.search-result-content ul > li div.product-name').innerText;

        let items = [];
        const imageIds = document.querySelectorAll('.search-result-content ul li div.product-tile')
        const productNames = document.querySelectorAll('.search-result-content ul li div.product-name');
        const previousPrices = document.querySelectorAll('.search-result-content ul li div.product-pricing .product-standard-price');
        const currentPrice = document.querySelectorAll('.search-result-content ul li div.product-pricing .product-sales-price');
        const colors = document.querySelectorAll('.search-result-content ul li div.product-colors');
        const imageLinks = document.querySelectorAll('.search-result-content ul li div.product-image a img')
        const itemLinks = document.querySelectorAll('.search-result-content ul li div.product-image a');

        document.querySelectorAll(".search-result-content ul.search-result-items li").forEach((item, i) => {
            items.push({
                id: imageIds[i].getAttribute('data-itemid'),
                name: productNames[i].innerText,
                prviousPrice: previousPrices[i].innerText,
                currentPrice: currentPrice[i].innerText,
                color: colors[i].innerText,
                image: imageLinks[i].getAttribute('src'),
                itemLink: itemLinks[i].getAttribute('href'),
            });
        });

        // imageIds.forEach(i => items.push(i.getAttribute('data-itemid')));
        // items.forEach(i => names.push(i.innerText));
        return items
    });

    // {
    //     // for (const [index, item] of result.entries()) {
    //     //     await page.goto(item.itemLink, { waitUntil: 'domcontentloaded' });
    //     //     await page.evaluate(() => {
    //     //         let details = document.querySelector('.product-info > .product-content .product-content').innerText;
    //     //         item.details = details;
    //     //         return null
    //     //     })
    //     // }
    // }

    for (const [index, item] of result.entries()) {
        // for (let i = 0; i <= 2; i++) {
        await page.goto(result[index].itemLink, { waitUntil: 'domcontentloaded' });
        let info = await page.evaluate(() => {
            let obj = {};
            let labels = [];
            let rawDetails = document.querySelector('.product-info > .product-content .product-content').innerText;
            let tempLabels = document.querySelectorAll('.product-info > .product-content .product-content b');

            if (rawDetails !== null) {
                rawDetails = rawDetails.replace(/(\r\n|\n|\r)/gm, "");
            }

            if (tempLabels !== null) {
                for (let i = 0; i < tempLabels.length; i++) {
                    labels.push(tempLabels[i] && tempLabels[i].innerText);
                }
            }

            if (labels.length > 0) {
                let details = rawDetails.replace(/(\r\n|\n|\r)/gm, "");

                // Get Description
                let description = details.match(/.+?(?=Features:)/) ? details.match(/.+?(?=Features:)/)[0] : null;
                obj.description = description;

                // Get Features
                let feautures = details.substring(
                    details.lastIndexOf("Features:"),
                    details.lastIndexOf("Composition")
                ).split("-");

                // deletes first feature as it is not a "feature"
                if (feautures.length > 0) {
                    feautures[0].toLowerCase().includes('features') ? feautures.splice(0, 1) : null
                }
                obj.features = feautures;

                // Get Composition
                let composition = details.substring(
                    details.lastIndexOf("Composition")
                ).split(":")[1];
                obj.composition = composition;

                // Get Discount Percentage
                let rawDescounts = document.querySelectorAll('.product-price span.percentage-save ');
                if (rawDescounts.length > 0) {
                    for (let i = 0; i < rawDescounts.length; i++) {
                        obj.percentageDescount = rawDescounts[i].innerText
                    }
                }

                // Get online sizes
                let onlineSizesRaw = document.querySelectorAll('.attribute.size #tab-online ul li.selectable.shrink.columns');
                obj.onlineSizes = [];
                if (onlineSizesRaw.length > 0) {
                    for (let i = 0; i < onlineSizesRaw.length; i++) {
                        obj.onlineSizes.push(onlineSizesRaw[i].innerText.replace(/(\r\n|\n|\r)/gm, "").trim());
                    }
                }


                // Get In-store sizes
                let inStoreSizesRaw = document.querySelectorAll('.attribute.size #tab-instore ul li.selectable.shrink.columns');
                obj.inStoreSizes = [];
                if (inStoreSizesRaw.length > 0) {
                    for (let i = 0; i < inStoreSizesRaw.length; i++) {
                        obj.inStoreSizes.push(inStoreSizesRaw[i].innerText.replace(/(\r\n|\n|\r)/gm, "").trim());
                    }
                }


            }

            return obj
        });
        let obj = Object.assign(info, result[index]);
        console.log(`Fetched Item ${index + 1}`);
        result[index] = obj;

    }

    let json = JSON.stringify(result);
    var fs = require('fs');
    fs.writeFile('sales.json', json, 'utf8', (err, data) => {
        if (err) return console.log(err);
        console.log('Created File');
    });

    await browser.close();
})();