const webdriver = require('selenium-webdriver')
const chrome = require('selenium-webdriver/chrome');

const fs = require('fs');

if (!fs.existsSync('./downloads')) {
    fs.mkdirSync('./downloads')
}


/* I'm not a robot button
<input type="button" class="usa-button" value="I am not a robot" onclick="reauth();">
*/

/* Data on the page
<div class="views-field views-field-title"><span class="field-content"><a href="https://www.justice.gov/epstein/files/DataSet%208/EFTA00025147.pdf" data-once="doj-analytics">EFTA00025147.pdf</a></span></div>
*/

let datasets = {
    1: 1,
    // 2: 2,
    // 3: 2,
    // 4: 4,
    // 5: 3,
    // 6: 1,
    // 7: 1,
    // 8: 221,
    // 9: 1003,
    // 10: 1200,
    // 11: 6538,
    // 12: 3
}

async function analyse() {
    try {
        let options = new chrome.Options();
        let driver = new webdriver.Builder()
        .forBrowser(webdriver.Browser.CHROME)
        .setChromeOptions(options)
        .build()
        
        //loopie
        for (let i = 1; i <= 12; i++) {
            let page = datasets[i]
            if (!page) continue
            console.log(`Dataset ${i}: ${page} pages`)
            for (let j = 1; j <= page; j++) {
                try {
                    let url = `https://www.justice.gov/epstein/doj-disclosures/data-set-${i}-files?page=${j}`
                    console.log(`Page num ${j}/${page}: ${url}`)
                    await driver.get(url)
                    await driver.sleep(3000)
                    let captcha = await driver.findElements(webdriver.By.css('input[value="I am not a robot"]'))
                    if (captcha.length > 0) {
                        console.log('captcha found, please solve it') //nvm we'll solve it
                        await captcha[0].click()
                        console.log('captcha clicked, waiting for solve...')
                        await driver.sleep(5000) //wait a few just incase.
                    }
                    let elements = await driver.findElements(webdriver.By.css('.views-field-title .field-content a'))
                    console.log(`Found ${elements.length} PDF(hehe did u get it?) files on this page`)
                    
                    // Check if age verification is needed
                    let ageBtn = await driver.findElements(webdriver.By.css('#age-button-yes'))
                    if (ageBtn.length > 0) {
                        console.log('Age verification clicking yes')
                        await ageBtn[0].click()
                        await driver.sleep(2000)
                    }
                    
                    for (let element of elements) {
                        let href = await element.getAttribute('href')
                        if (!href) {
                            console.log(`Invalid href hmmm`)
                            continue
                        }
                        let filename = href.split('/').pop().split('?')[0]
                        try {
                            //Check if already downloaded spo we don't redownload
                            if (fs.existsSync(`./downloads/${filename}`)) {
                                const existing = fs.statSync(`./downloads/${filename}`).size
                                if (existing > 1000) { //Already downloaded
                                    console.log(`already downloaded: ${filename}`)
                                    continue
                                }
                            }

                            //go to the PDF
                            let handles = await driver.getAllWindowHandles()
                            let currentHandle = handles[0]
                            await driver.executeScript(`window.open('${href}', '_blank')`)
                            await driver.sleep(1500)
                            
                            //tabieswitchieeee
                            handles = await driver.getAllWindowHandles()
                            let newHandle = handles[handles.length - 1]
                            await driver.switchTo().window(newHandle)
                            await driver.sleep(2000)
                            let pdfData = await driver.executeScript(`
                                return fetch(window.location.href, {credentials: 'include'})
                                    .then(r => r.arrayBuffer())
                                    .then(buf => Array.from(new Uint8Array(buf)))
                            `)
                            await driver.close()
                            await driver.switchTo().window(currentHandle)
                            if (!pdfData || pdfData.length === 0) {
                                console.log(`Sumtin wrong: ${filename}`)
                                continue
                            }
                            
                            let buffer = Buffer.from(pdfData)
                            const header = buffer.toString('utf8', 0, 10)
                            fs.writeFileSync(`./downloads/${filename}`, buffer)
                            
                            if (header.includes('%PDF')) {
                                console.log(`downloaded da Pedofile: ${filename}`)
                            }
                        } catch (err) {
                            console.log(`ERR: ${filename}: ${err.message}`)
                        }
                    }
                } catch (err) {
                    console.log(`ERR: ${j}: ${err.message}`)
                }
            }
        }
        await driver.quit()
    } catch (error) {
        console.error('ERR: ', error)
    }
}

analyse();
