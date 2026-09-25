"""UI regression: run npm start and chromedriver --port=9515, then python docs/browser-smoke.py."""
import urllib.request,json,time,base64,os
base=os.environ.get('WEBDRIVER_URL','http://127.0.0.1:9515')
app=os.environ.get('ARENA_URL','http://127.0.0.1:3000')
def req(path,data=None,method=None):
    request=urllib.request.Request(base+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'},method=method or ('POST' if data is not None else 'GET'))
    with urllib.request.urlopen(request) as response: value=json.load(response)['value']
    if isinstance(value,dict) and 'error' in value: raise AssertionError(value)
    return value
session=req('/session',{'capabilities':{'alwaysMatch':{'browserName':'chrome','goog:chromeOptions':{'args':['--headless','--no-sandbox','--disable-dev-shm-usage','--window-size=1440,900']},'goog:loggingPrefs':{'browser':'ALL'}}}})['sessionId']
p='/session/'+session

def js(code):return req(p+'/execute/sync',{'script':code,'args':[]})
def click(selector):
    element=req(p+'/element',{'using':'css selector','value':selector})
    req(p+'/element/'+element['element-6066-11e4-a52e-4f735466cecf']+'/click',{})
    time.sleep(.85)
def button(text):
    selector=js('const b=[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==='+json.dumps(text)+');if(!b)return null;b.dataset.testClick="yes";return "[data-test-click=yes]"')
    assert selector,text
    click(selector);js('document.querySelector("[data-test-click]")?.removeAttribute("data-test-click")')
def has(text):assert text in js('return document.body.innerText'),text
def size(w,h):
    req(p+'/goog/cdp/execute',{'cmd':'Emulation.setDeviceMetricsOverride','params':{'width':w,'height':h,'deviceScaleFactor':1,'mobile':w<701}});time.sleep(.4)
def fits(selector):
    value=js('return [...document.querySelectorAll('+json.dumps(selector)+')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.slice(0,50),x:r.x,y:r.y,b:r.bottom,r:r.right,h:innerHeight,w:innerWidth}})')
    assert value,selector
    assert all(x['x']>=-1 and x['y']>=-1 and x['r']<=x['w']+1 and x['b']<=x['h']+1 for x in value),(selector,value)
    assert js('return document.documentElement.scrollHeight <= innerHeight+1 && document.documentElement.scrollWidth <= innerWidth+1'),'page overflow'
def snap(name):
    open('/tmp/arena-'+name+'.png','wb').write(base64.b64decode(req(p+'/screenshot')))
try:
    req(p+'/url',{'url':app});time.sleep(1.2)
    has('За каждой позицией — человек.');snap('welcome-desktop')
    for w,h in [(1440,900),(1366,768),(390,844),(375,667),(320,568)]:
        size(w,h);fits('.welcome-controls, .welcome-top, .chapter')
    size(390,844);snap('welcome-mobile')
    for _ in range(3):
        button('Дальше')
        assert js('return document.activeElement.tagName')=='H1','legend focus'
        size(320,568);fits('.welcome-controls, .chapter')
        assert js('return document.querySelector(".chapter").scrollHeight<=document.querySelector(".chapter").clientHeight+1'),'legend content clipping'
        size(390,844)
    has('В «Настройках»');button('Войти в арену');has('Любой разговор')
    for w,h in [(1440,900),(1366,768),(390,844),(375,667),(320,568)]:
        size(w,h);fits('.scenario-card, .custom-banner, .nav-item')
        assert js('return [...document.querySelectorAll(".scenario-card")].every(e=>e.scrollHeight<=e.clientHeight+1)'),('card clipping',w,h)
        if w==390:snap('menu-mobile')
    size(1440,900);snap('menu-desktop')
    click('.scenario-card.supplier');button('Начать переговоры');has('Напряжённость')
    initial=int(js('return document.querySelector(".negotiation").dataset.tension'))
    for w,h in [(1366,768),(390,844),(375,667),(320,568)]:
        size(w,h);fits('.options button, .input-row, .opponent')
        assert js('return document.querySelector(".conversation").scrollHeight <= document.querySelector(".conversation").clientHeight+1'),('conversation clipping',w,h)
    size(390,844);snap('dialog-mobile')
    click('.options button:nth-child(2)')
    assert int(js('return document.querySelector(".negotiation").dataset.tension'))>initial
    click('.options button:nth-child(3)');has('На грани срыва');assert js('return !!document.querySelector(".tension-high")')
    size(1440,900);snap('tension-desktop')
    for _ in range(2):click('.options button:nth-child(3)')
    button('Посмотреть разбор');has('Каждая попытка делает вас сильнее.')
    for w,h in [(1366,768),(390,844),(375,667)]:
        size(w,h);fits('.review-tabs, .result-footer, .result-metrics')
    click('.review-tabs button:nth-child(3)');has('Это моё последнее предложение')
    button('Попробовать иначе')
    for _ in range(4):click('.options button:first-child')
    button('Посмотреть разбор');has('Общий язык найден.');size(390,844);snap('results-mobile')
    button('Прогресс');has('Цена долгосрочного контракта')
    req(p+'/refresh',{});time.sleep(1);has('Общий язык найден.');button('Прогресс');has('Цена долгосрочного контракта')
    button('Конструктор');fits('.form-footer');button('Протестировать');button('Начать переговоры')
    click('.session-controls .icon-button');has('ВАША ЗАДАЧА');button('Вернуться к разговору')
    draft='Понимаю ваши интересы. Давайте найдём решение вместе.'
    field=req(p+'/element',{'using':'css selector','value':'.input-row input'})
    req(p+'/element/'+field['element-6066-11e4-a52e-4f735466cecf']+'/value',{'text':draft})
    button('Настройки');button('Арена');assert js('return document.querySelector(".input-row input").value')==draft,'draft lost on navigation'
    req(p+'/refresh',{});time.sleep(1);assert js('return document.querySelector(".input-row input").value')==draft,'draft lost on refresh'
    button('Прогресс');click('.history-item');button('Попробовать иначе');has('Новая практика заменит текущую')
    click('.modal .close');button('Арена');assert js('return document.querySelector(".input-row input").value')==draft,'history retry replaced active session'
    click('.send-button');assert js('return document.querySelector(".input-row input").value')=='','draft not cleared'
    button('Конструктор')
    js('const e=document.querySelector("select");e.value="career";e.dispatchEvent(new Event("change",{bubbles:true}))')
    button('Протестировать');button('Начать переговоры')
    for stage in range(4):
        for w,h in [(1366,768),(390,844),(375,667),(320,568)]:
            size(w,h);fits('.options button, .input-row')
            assert js('return document.querySelector(".conversation").scrollHeight<=document.querySelector(".conversation").clientHeight+1'),('career clipping',stage,w,h)
        click('.options button:first-child')
    button('Посмотреть разбор');has('Общий язык найден.')
    size(390,844)
    button('Настройки');has('Получить API-ключ')
    assert js('return document.querySelector(".api-actions a").href')=='https://platform.openai.com/api-keys'
    assert js('return document.querySelector("[aria-label=\\"API-ключ OpenAI\\"]").type')=='password'
    click('[role=switch]');assert js('return document.querySelector("[role=switch]").getAttribute("aria-checked")')=='true'
    req(p+'/refresh',{});time.sleep(1);button('Настройки');assert js('return document.querySelector("[role=switch]").getAttribute("aria-checked")')=='true'
    button('Посмотреть');has('За каждой позицией — человек.');button('Пропустить знакомство');has('Настройки арены.')
    size(1440,900);snap('settings-desktop')
    # System reduced motion must disable CSS animation too.
    click('[role=switch]')
    req(p+'/goog/cdp/execute',{'cmd':'Emulation.setEmulatedMedia','params':{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]}})
    button('Посмотреть');assert js('return getComputedStyle(document.querySelector(".welcome-core")).animationName')=='none'
    errors=[x for x in req(p+'/log',{'type':'browser'}) if x['level']=='SEVERE' and 'favicon' not in x['message']]
    assert not errors,errors
    print('PASS: legend, 5 viewport sizes, no page overflow or hidden controls, tension escalation, losing/winning paths, review tabs, persistence, constructor, mission modal, draft persistence, protected retry, career at all sizes, API link, quiet mode, replay, reduced motion, clean console')
finally:req(p,method='DELETE')
