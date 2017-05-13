var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
// ==UserScript==
// @name           Virtonomica: management
// @namespace      https://github.com/ra81/management
// @version 	   1.82
// @description    Добавление нового функционала к управлению предприятиями
// @include        https://*virtonomic*.*/*/main/company/view/*
// @include        https://*virtonomic*.*/*/window/company/view/*
// @require        https://code.jquery.com/jquery-1.11.1.min.js
// @noframes
// ==/UserScript== 
// 
// Набор вспомогательных функций для использования в других проектах. Универсальные
//   /// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
// список типов юнитов. берется по картинке в юните, или с класса i-farm, i-office в списках юнитов
var UnitTypes;
(function (UnitTypes) {
    UnitTypes[UnitTypes["unknown"] = 0] = "unknown";
    UnitTypes[UnitTypes["animalfarm"] = 1] = "animalfarm";
    UnitTypes[UnitTypes["farm"] = 2] = "farm";
    UnitTypes[UnitTypes["lab"] = 3] = "lab";
    UnitTypes[UnitTypes["mill"] = 4] = "mill";
    UnitTypes[UnitTypes["mine"] = 5] = "mine";
    UnitTypes[UnitTypes["office"] = 6] = "office";
    UnitTypes[UnitTypes["oilpump"] = 7] = "oilpump";
    UnitTypes[UnitTypes["orchard"] = 8] = "orchard";
    UnitTypes[UnitTypes["sawmill"] = 9] = "sawmill";
    UnitTypes[UnitTypes["shop"] = 10] = "shop";
    UnitTypes[UnitTypes["seaport"] = 11] = "seaport";
    UnitTypes[UnitTypes["warehouse"] = 12] = "warehouse";
    UnitTypes[UnitTypes["workshop"] = 13] = "workshop";
    UnitTypes[UnitTypes["villa"] = 14] = "villa";
    UnitTypes[UnitTypes["fishingbase"] = 15] = "fishingbase";
    UnitTypes[UnitTypes["service_light"] = 16] = "service_light";
    UnitTypes[UnitTypes["fitness"] = 17] = "fitness";
    UnitTypes[UnitTypes["medicine"] = 18] = "medicine";
    UnitTypes[UnitTypes["restaurant"] = 19] = "restaurant";
    UnitTypes[UnitTypes["laundry"] = 20] = "laundry";
    UnitTypes[UnitTypes["hairdressing"] = 21] = "hairdressing";
    UnitTypes[UnitTypes["power"] = 22] = "power";
    UnitTypes[UnitTypes["coal_power"] = 23] = "coal_power";
    UnitTypes[UnitTypes["incinerator_power"] = 24] = "incinerator_power";
    UnitTypes[UnitTypes["oil_power"] = 25] = "oil_power";
    UnitTypes[UnitTypes["fuel"] = 26] = "fuel";
    UnitTypes[UnitTypes["repair"] = 27] = "repair";
    UnitTypes[UnitTypes["apiary"] = 28] = "apiary";
    UnitTypes[UnitTypes["educational"] = 29] = "educational";
    UnitTypes[UnitTypes["kindergarten"] = 30] = "kindergarten";
    UnitTypes[UnitTypes["sun_power"] = 31] = "sun_power";
    UnitTypes[UnitTypes["network"] = 32] = "network";
    UnitTypes[UnitTypes["it"] = 33] = "it";
    UnitTypes[UnitTypes["cellular"] = 34] = "cellular";
})(UnitTypes || (UnitTypes = {}));
// уровни сервиса
var ServiceLevels;
(function (ServiceLevels) {
    ServiceLevels[ServiceLevels["none"] = -1] = "none";
    ServiceLevels[ServiceLevels["lower"] = 0] = "lower";
    ServiceLevels[ServiceLevels["low"] = 1] = "low";
    ServiceLevels[ServiceLevels["normal"] = 2] = "normal";
    ServiceLevels[ServiceLevels["high"] = 3] = "high";
    ServiceLevels[ServiceLevels["higher"] = 4] = "higher";
    ServiceLevels[ServiceLevels["elite"] = 5] = "elite";
})(ServiceLevels || (ServiceLevels = {}));
/**
 * Простенький конвертер, который из множества формирует массив значений множества. По факту массив чисел.
   используется внутреннее представление множеств и как бы может сломаться в будущем
 * @param enumType тип множества
 */
function enum2Arr(enumType) {
    let res = [];
    for (let key in enumType) {
        if (typeof enumType[key] === "number")
            res.push(enumType[key]);
    }
    return res;
}
/**
 * Простой счетчик. Увеличивается на 1 при каждом вызове метода Next. Нужен для подсчета числа запросов
 */
class Counter {
    constructor() {
        this.Next = () => {
            this._count++;
        };
        this._count = 0;
    }
    ;
    get Count() {
        return this._count;
    }
}
/**
 * Проверяет наличие в словаре ключей. Шорт алиас для удобства.
 * Если словарь не задать, вывалит исключение
 * @param dict проверяемый словарь
 */
function isEmpty(dict) {
    return Object.keys(dict).length === 0; // исключение на null
}
/**
 * Конвертит словарь в простую текстовую строку вида "key:val, key1:val1"
 * значения в строку конвертятся штатным toString()
 * Создана чисто потому что в словарь нельзя засунуть методы.
 * @param dict
 */
function dict2String(dict) {
    if (isEmpty(dict))
        return "";
    let newItems = [];
    for (let key in dict)
        newItems.push(key + ":" + dict[key].toString());
    return newItems.join(", ");
}
/**
 * Фильтрует заданный словарь. Выбирает из него только те элементы которые проходят фильтр.
 * В любом раскладе возвращает пустой словарь
 * @param dict
 * @param selector
 */
function filterDictVal(dict, selector) {
    let res = {};
    for (let key in dict) {
        let item = dict[key];
        if (selector(item))
            res[key] = item;
    }
    return res;
}
/**
 * Склеивает два словаря вместе. Ключи не теряются, если есть одинаковые то вывалит ошибку
 * @param dict1
 * @param dict2
 */
function mergeDict(dict1, dict2) {
    if (dict1 == null || dict2 == null)
        throw new Error("аргументы не должны быть null");
    let res = {};
    for (let key in dict1)
        res[key] = dict1[key];
    for (let key in dict2) {
        if (res[key] != null)
            throw new Error(`dict1 уже имеет такой же ключ '${key}' как и dict2`);
        res[key] = dict2[key];
    }
    return res;
}
function mergeDictN(dict1, dict2) {
    if (dict1 == null || dict2 == null)
        throw new Error("аргументы не должны быть null");
    let res = {};
    for (let key in dict1)
        res[key] = dict1[key];
    for (let key in dict2) {
        if (res[key] != null)
            throw new Error(`dict1 уже имеет такой же ключ '${key}' как и dict2`);
        res[key] = dict2[key];
    }
    return res;
}
/**
 * Проверяет что элемент есть в массиве.
 * @param item
 * @param arr массив НЕ null
 */
function isOneOf(item, arr) {
    if (arr.length <= 0)
        return false;
    return arr.indexOf(item) >= 0;
}
/**
 * Преобразует массив в словарь используя заданные селектор ключа.
 * @param arr
 * @param keySelector
 */
function toDictionaryN(arr, keySelector) {
    let res = {};
    if (!arr)
        throw new Error("arr null");
    if (!keySelector)
        throw new Error("keySelector null");
    for (let el of arr) {
        let k = keySelector(el);
        if (!k)
            throw new Error("Ключ не может быть неопределен!");
        if (res[k])
            throw new Error("Обнаружено повторение ключа!");
        res[k] = el;
    }
    return res;
}
/**
 * Возвращает только уникальные значения массива. Для объектов идет сравнение ссылок, само содержимое не сравнивается
 * @param array
 */
function unique(array) {
    let res = [];
    for (let i = 0; i < array.length; i++) {
        let item = array[i];
        if (array.indexOf(item) === i)
            res.push(item);
    }
    return res;
}
/**
 * Находит пересечение двух массивов. Объекты сравнивать будет по ссылкам. Дубли удаляются.
 * Возвращает массив уникальных значений имеющихся в обоих массивах
 * @param a
 * @param b
 */
function intersect(a, b) {
    // чтобы быстрее бегал indexOf в A кладем более длинный массив
    if (b.length > a.length) {
        let t = b;
        b = a;
        a = t;
    }
    // находим пересечение с дублями
    let intersect = [];
    for (let item of a) {
        if (b.indexOf(item) >= 0)
            intersect.push(item);
    }
    // если надо удалить дубли, удаляем
    return unique(intersect);
}
// NUMBER ------------------------------------------
/**
 * round до заданного числа знаков. Может дать погрешность на округлении но похрен
 * @param n
 * @param decimals
 */
function roundTo(n, decimals) {
    if (isNaN(n) || isNaN(decimals))
        throw new Error(`числа должны быть заданы. n:${n}, decimals:${decimals}`);
    if (decimals < 0)
        throw new Error(`decimals: ${decimals} не может быть меньше 0`);
    decimals = Math.round(decimals); // делаем ставку на косяки округления откуда может прилететь 1.00000001
    let f = Math.pow(10, decimals);
    return Math.round(n * f) / f;
}
/**
 * floor до заданного числа знаков. Может дать погрешность если будет число вида x.99999999999
   так как при расчетах прибавляет 1е-10. Но это очень редкий случай когда округлит вверх
 * @param n
 * @param decimals
 */
function floorTo(n, decimals) {
    if (isNaN(n) || isNaN(decimals))
        throw new Error(`числа должны быть заданы. n:${n}, decimals:${decimals}`);
    if (decimals < 0)
        throw new Error(`decimals: ${decimals} не может быть меньше 0`);
    decimals = Math.round(decimals); // делаем ставку на косяки округления откуда может прилететь 1.00000001
    let f = Math.pow(10, decimals);
    return Math.floor(n * f + 1e-10) / f;
}
/**
 * ceil до заданного числа знаков. Может дать погрешность если будет число вида x.00000000000001
   так как при расчетах вычитает 1е-10. Но это очень редкий случай когда округлит вверх
 * @param n
 * @param decimals
 */
function ceilTo(n, decimals) {
    if (isNaN(n) || isNaN(decimals))
        throw new Error(`числа должны быть заданы. n:${n}, decimals:${decimals}`);
    if (decimals < 0)
        throw new Error(`decimals: ${decimals} не может быть меньше 0`);
    decimals = Math.round(decimals); // делаем ставку на косяки округления откуда может прилететь 1.00000001
    let f = Math.pow(10, decimals);
    return Math.ceil(n * f - 1e-10) / f;
}
// PARSE -------------------------------------------
/**
 * удаляет из строки все денежные и специальные символы типо процента и пробелы между цифрами
 * @param str
 */
function cleanStr(str) {
    return str.replace(/[\s\$\%\©]/g, "");
}
/**
 * Выдергивает реалм из текущего href ссылки если это возможно.
 */
function getRealm() {
    // https://*virtonomic*.*/*/main/globalreport/marketing/by_trade_at_cities/*
    // https://*virtonomic*.*/*/window/globalreport/marketing/by_trade_at_cities/*
    let rx = new RegExp(/https:\/\/virtonomic[A-Za-z]+\.[a-zA-Z]+\/([a-zA-Z]+)\/.+/ig);
    let m = rx.exec(document.location.href);
    if (m == null)
        return null;
    return m[1];
}
function getRealmOrError() {
    let realm = getRealm();
    if (realm === null)
        throw new Error("Не смог определить реалм по ссылке " + document.location.href);
    return realm;
}
/**
 * Парсит id компании со страницы и выдает ошибку если не может спарсить
 */
function getCompanyId() {
    let str = matchedOrError($("a.dashboard").attr("href"), /\d+/);
    return numberfyOrError(str);
}
/**
 * Оцифровывает строку. Возвращает всегда либо число или Number.POSITIVE_INFINITY либо -1 если str не содержит числа.
 * @param variable любая строка.
 */
function numberfy(str) {
    // возвращает либо число полученно из строки, либо БЕСКОНЕЧНОСТЬ, либо -1 если не получилось преобразовать.
    if (String(str) === 'Не огр.' ||
        String(str) === 'Unlim.' ||
        String(str) === 'Не обм.' ||
        String(str) === 'N’est pas limité' ||
        String(str) === 'No limitado' ||
        String(str) === '无限' ||
        String(str) === 'Nicht beschr.') {
        return Number.POSITIVE_INFINITY;
    }
    else {
        // если str будет undef null или что то страшное, то String() превратит в строку после чего парсинг даст NaN
        // не будет эксепшнов
        let n = parseFloat(cleanStr(String(str)));
        return isNaN(n) ? -1 : n;
    }
}
/**
 * Пробуем оцифровать данные но если они выходят как Number.POSITIVE_INFINITY или <= minVal, валит ошибку.
   смысл в быстром вываливании ошибки если парсинг текста должен дать число
   Нужно понимать что если оцифровка не удалась, то получится -1 и при minVal=0 выдаст ошибку конечно
 * @param value строка являющая собой число больше minVal
 * @param minVal ограничение снизу. Число.
 * @param infinity разрешена ли бесконечность
 */
function numberfyOrError(str, minVal = 0, infinity = false) {
    let n = numberfy(str);
    if (!infinity && (n === Number.POSITIVE_INFINITY || n === Number.NEGATIVE_INFINITY))
        throw new RangeError("Получили бесконечность, что запрещено.");
    if (n <= minVal)
        throw new RangeError("Число должно быть > " + minVal);
    return n;
}
/**
 * Ищет паттерн в строке. Предполагая что паттерн там обязательно есть 1 раз. Если
 * нет или случился больше раз, валим ошибку
 * @param str строка в которой ищем
 * @param rx паттерн который ищем
 */
function matchedOrError(str, rx, errMsg) {
    let m = str.match(rx);
    if (m == null)
        throw new Error(errMsg || `Паттерн ${rx} не найден в ${str}`);
    if (m.length > 1)
        throw new Error(errMsg || `Паттерн ${rx} найден в ${str} ${m.length} раз вместо ожидаемого 1`);
    return m[0];
}
/**
 * Пробуем прогнать регулярное выражение на строку, если не прошло, то вывалит ошибку.
 * иначе вернет массив. 0 элемент это найденная подстрока, остальные это найденные группы ()
 * @param str
 * @param rx
 * @param errMsg
 */
function execOrError(str, rx, errMsg) {
    let m = rx.exec(str);
    if (m == null)
        throw new Error(errMsg || `Паттерн ${rx} не найден в ${str}`);
    return m;
}
/**
 * из строки пробует извлечь все вещественные числа. Рекомендуется применять ТОЛЬКО для извлечения из текстовых строк.
 * для простого парсинга числа пойдет numberfy
 * Если их нет вернет null
 * @param str
 */
function extractFloatPositive(str) {
    let m = cleanStr(str).match(/\d+\.\d+/ig);
    if (m == null)
        return null;
    let n = m.map((val, i, arr) => numberfyOrError(val, -1));
    return n;
}
/**
 * из указанной строки, извлекает числа. обычно это id юнита товара и так далее
 * @param str
 */
function extractIntPositive(str) {
    let m = cleanStr(str).match(/\d+/ig);
    if (m == null)
        return null;
    let n = m.map((val, i, arr) => numberfyOrError(val, -1));
    return n;
}
/**
 * По текстовой строке возвращает номер месяца начиная с 0 для января. Либо null
 * @param str очищенная от пробелов и лишних символов строка
 */
function monthFromStr(str) {
    let mnth = ["январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"];
    for (let i = 0; i < mnth.length; i++) {
        if (str.indexOf(mnth[i]) === 0)
            return i;
    }
    return null;
}
/**
 * По типовой игровой строке даты вида 10 января 55 г., 3 февраля 2017 - 22.10.12
 * выдергивает именно дату и возвращает в виде объекта даты
 * @param str
 */
function extractDate(str) {
    let dateRx = /^(\d{1,2})\s+([а-я]+)\s+(\d{1,4})/i;
    let m = dateRx.exec(str);
    if (m == null)
        return null;
    let d = parseInt(m[1]);
    let mon = monthFromStr(m[2]);
    if (mon == null)
        return null;
    let y = parseInt(m[3]);
    return new Date(y, mon, d);
}
/**
 * из даты формирует короткую строку типа 01.12.2017
 * @param date
 */
function dateToShort(date) {
    let d = date.getDate();
    let m = date.getMonth() + 1;
    let yyyy = date.getFullYear();
    let dStr = d < 10 ? "0" + d : d.toString();
    let mStr = m < 10 ? "0" + m : m.toString();
    return `${dStr}.${mStr}.${yyyy}`;
}
/**
 * из строки вида 01.12.2017 формирует дату
 * @param str
 */
function dateFromShort(str) {
    let items = str.split(".");
    let d = parseInt(items[0]);
    if (d <= 0)
        throw new Error("дата неправильная.");
    let m = parseInt(items[1]) - 1;
    if (m < 0)
        throw new Error("месяц неправильная.");
    let y = parseInt(items[2]);
    if (y < 0)
        throw new Error("год неправильная.");
    return new Date(y, m, d);
}
/**
 * По заданному числу возвращает число с разделителями пробелами для удобства чтения
 * @param num
 */
function sayNumber(num) {
    if (num < 0)
        return "-" + sayNumber(-num);
    if (Math.round(num * 100) / 100 - Math.round(num))
        num = Math.round(num * 100) / 100;
    else
        num = Math.round(num);
    let s = num.toString();
    let s1 = "";
    let l = s.length;
    let p = s.indexOf(".");
    if (p > -1) {
        s1 = s.substr(p);
        l = p;
    }
    else {
        p = s.indexOf(",");
        if (p > -1) {
            s1 = s.substr(p);
            l = p;
        }
    }
    p = l - 3;
    while (p >= 0) {
        s1 = ' ' + s.substr(p, 3) + s1;
        p -= 3;
    }
    if (p > -3) {
        s1 = s.substr(0, 3 + p) + s1;
    }
    if (s1.substr(0, 1) == " ") {
        s1 = s1.substr(1);
    }
    return s1;
}
/**
 * Для денег подставляет нужный символ при выводе на экран. Округляет до 2 знаков,
   так же вставляет пробелы как разделитель для тысяч
 * @param num
 * @param symbol
 */
function sayMoney(num, symbol = "$") {
    let result = sayNumber(num);
    if (symbol != null) {
        if (num < 0)
            result = '-' + symbol + sayNumber(Math.abs(num));
        else
            result = symbol + result;
    }
    return result;
}
/**
 * Пробует взять со страницы картинку юнита и спарсить тип юнита
 * Пример сорса /img/v2/units/shop_1.gif  будет тип shop.
 * Он кореллирует четко с i-shop в списке юнитов
 * Если картинки на странице нет, то вернет null. Сам разбирайся почему ее там нет
 * @param $html
 */
function getUnitType($html) {
    let $div = $html.find("#unitImage");
    if ($div.length === 0)
        return null;
    let src = $div.find("img").attr("src");
    let items = src.split("/");
    if (items.length < 2)
        throw new Error("Что то не так с урлом картинки " + src);
    let typeStr = items[items.length - 1].split("_")[0];
    let type = UnitTypes[typeStr] ? UnitTypes[typeStr] : UnitTypes.unknown;
    if (type == UnitTypes.unknown)
        throw new Error("Не описан тип юнита " + typeStr);
    return type;
}
/**
 * Форматирует строки в соответствии с форматом в C#. Плейсхолдеры {0}, {1} заменяет на аргументы.
   если аргумента НЕТ а плейсхолдер есть, вывалит исключение, как и в сишарпе.
 * @param str шаблон строки
 * @param args аргументы которые подставить
 */
function formatStr(str, ...args) {
    let res = str.replace(/{(\d+)}/g, (match, number) => {
        if (args[number] == null)
            throw new Error(`плейсхолдер ${number} не имеет значения`);
        return args[number];
    });
    return res;
}
// РЕГУЛЯРКИ ДЛЯ ССЫЛОК ------------------------------------
// для 1 юнита
// 
let url_unit_rx = /\/[a-z]+\/(?:main|window)\/unit\/view\/\d+/i; // внутри юнита. любая страница
let url_unit_main_rx = /\/\w+\/(?:main|window)\/unit\/view\/\d+\/?$/i; // главная юнита
let url_unit_finance_report = /\/[a-z]+\/main\/unit\/view\/\d+\/finans_report(\/graphical)?$/i; // финанс отчет
let url_trade_hall_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/trading_hall\/?/i; // торговый зал
let url_price_history_rx = /\/[a-z]+\/(?:main|window)\/unit\/view\/\d+\/product_history\/\d+\/?/i; // история продаж в магазине по товару
let url_supply_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/supply\/?/i; // снабжение
let url_sale_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/sale\/?/i; // продажа склад/завод
let url_ads_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/virtasement$/i; // реклама
let url_education_rx = /\/[a-z]+\/window\/unit\/employees\/education\/\d+\/?/i; // обучение
let url_supply_create_rx = /\/[a-z]+\/unit\/supply\/create\/\d+\/step2\/?$/i; // заказ товара в маг, или склад. в общем стандартный заказ товара
let url_equipment_rx = /\/[a-z]+\/window\/unit\/equipment\/\d+\/?$/i; // заказ оборудования на завод, лабу или куда то еще
// для компании
// 
let url_unit_list_rx = /\/[a-z]+\/(?:main|window)\/company\/view\/\d+(\/unit_list)?(\/xiooverview|\/overview)?$/i; // список юнитов. Работает и для списка юнитов чужой компании
let url_rep_finance_byunit = /\/[a-z]+\/main\/company\/view\/\d+\/finance_report\/by_units(?:\/.*)?$/i; // отчет по подразделениями из отчетов
let url_rep_ad = /\/[a-z]+\/main\/company\/view\/\d+\/marketing_report\/by_advertising_program$/i; // отчет по рекламным акциям
let url_manag_equip_rx = /\/[a-z]+\/window\/management_units\/equipment\/(?:buy|repair)$/i; // в окне управления юнитами групповой ремонт или закупка оборудования
let url_manag_empl_rx = /\/[a-z]+\/main\/company\/view\/\d+\/unit_list\/employee\/?$/i; // управление - персонал
// для для виртономики
// 
let url_global_products_rx = /[a-z]+\/main\/globalreport\/marketing\/by_products\/\d+\/?$/i; // глобальный отчет по продукции из аналитики
let url_products_rx = /\/[a-z]+\/main\/common\/main_page\/game_info\/products$/i; // страница со всеми товарами игры
let url_city_retail_report_rx = /\/[a-z]+\/(?:main|window)\/globalreport\/marketing\/by_trade_at_cities\/\d+/i; // розничный отчет по конкретному товару
let url_products_size_rx = /\/[a-z]+\/main\/industry\/unit_type\/info\/2011\/volume\/?/i; // размеры продуктов на склада
let url_country_duties_rx = /\/[a-z]+\/main\/geo\/countrydutylist\/\d+\/?/i; // таможенные пошлины и ИЦ
let url_tm_info_rx = /\/[a-z]+\/main\/globalreport\/tm\/info/i; // брендовые товары список
/**
 * По заданной ссылке и хтмл определяет находимся ли мы внутри юнита или нет.
 * Если на задавать ссылку и хтмл то берет текущий документ.
 * Вызов без параметров приводит к определению находимся ли мы своем юните сейчас
 * @param urlPath
 * @param $html
 * @param my своя компания или нет?
 */
function isUnit(urlPath, $html, my = true) {
    if (!urlPath || !$html) {
        urlPath = document.location.pathname;
        $html = $(document);
    }
    // для ситуации когда мы внутри юнита характерно что всегда ссылка вида 
    // https://virtonomica.ru/olga/main/unit/view/6452212/*
    let urlOk = url_unit_rx.test(urlPath);
    if (!urlOk)
        return false;
    // но у своего юнита ссыль на офис имеет тот же айди что и ссыль на дашборду. А для чужого нет
    let urlOffice = $html.find("div.officePlace a").attr("href");
    let urlDash = $html.find("a.dashboard").attr("href");
    if (urlOffice.length === 0 || urlDash.length === 0)
        throw new Error("Ссылка на офис или дашборду не может быть найдена");
    let isMy = (`${urlOffice}/dashboard` === urlDash);
    return my ? isMy : !isMy;
}
/**
 * Проверяет что мы именно на своей странице со списком юнитов. По ссылке и id компании
 * Проверок по контенту не проводит.
 */
function isMyUnitList() {
    // для своих и чужих компани ссылка одна, поэтому проверяется и id
    if (url_unit_list_rx.test(document.location.pathname) === false)
        return false;
    // запрос id может вернуть ошибку если мы на window ссылке. значит точно у чужого васи
    try {
        let id = getCompanyId();
        let urlId = extractIntPositive(document.location.pathname); // полюбому число есть иначе регекс не пройдет
        if (urlId[0] != id)
            return false;
    }
    catch (err) {
        return false;
    }
    return true;
}
/**
 * Проверяет что мы именно на чужой!! странице со списком юнитов. По ссылке.
 * Проверок по контенту не проводит.
 */
function isOthersUnitList() {
    // для своих и чужих компани ссылка одна, поэтому проверяется и id
    if (url_unit_list_rx.test(document.location.pathname) === false)
        return false;
    try {
        // для чужого списка будет разный айди в дашборде и в ссылке
        let id = getCompanyId();
        let urlId = extractIntPositive(document.location.pathname); // полюбому число есть иначе регекс не пройдет
        if (urlId[0] === id)
            return false;
    }
    catch (err) {
        // походу мы на чужом window списке. значит ок
        return true;
    }
    return true;
}
function isUnitMain(urlPath, html, my = true) {
    let ok = url_unit_main_rx.test(urlPath);
    if (!ok)
        return false;
    let hasTabs = $(html).find("ul.tabu").length > 0;
    if (my)
        return hasTabs;
    else
        return !hasTabs;
}
//function isOthersUnitMain() {
//    // проверим линк и затем наличие табулятора. Если он есть то свой юнит, иначе чужой
//    let ok = url_unit_main_rx.test(document.location.pathname);
//    if (ok)
//        ok = $("ul.tabu").length === 0;
//    return ok;
//}
function isUnitFinanceReport() {
    return url_unit_finance_report.test(document.location.pathname);
}
function isCompanyRepByUnit() {
    return url_rep_finance_byunit.test(document.location.pathname);
}
/**
 * Возвращает Истину если данная страница есть страница в магазине своем или чужом. Иначе Ложь
 * @param html полностью страница
 * @param my свой юнит или чужой
 */
function isShop(html, my = true) {
    let $html = $(html);
    // нет разницы наш или чужой юнит везде картинка мага нужна. ее нет только если window
    let $img = $html.find("#unitImage img[src*='/shop_']");
    if ($img.length > 1)
        throw new Error(`Найдено несколько (${$img.length}) картинок Магазина.`);
    return $img.length > 0;
}
function isWarehouse($html) {
    // нет разницы наш или чужой юнит везде картинка мага нужна. ее нет только если window
    let $img = $html.find("#unitImage img[src*='/warehouse_']");
    if ($img.length > 1)
        throw new Error(`Найдено несколько (${$img.length}) картинок Склада.`);
    return $img.length > 0;
}
/**
 * Возвращает Истину если данная страница есть страница в заправке своей или чужой. Иначе Ложь
 * @param html полностью страница
 * @param my свой юнит или чужой
 */
function isFuel(html, my = true) {
    let $html = $(html);
    // нет разницы наш или чужой юнит везде картинка мага нужна
    let $img = $html.find("#unitImage img[src*='/fuel_']");
    if ($img.length > 1)
        throw new Error(`Найдено несколько (${$img.length}) картинок Магазина.`);
    return $img.length > 0;
}
function hasTradeHall(html, my = true) {
    let $html = $(html);
    if (my) {
        let $a = $html.find("ul.tabu a[href$=trading_hall]");
        if ($a.length > 1)
            throw new Error("Найдено больше одной ссылки на трейдхолл.");
        return $a.length === 1;
    }
    else
        return false;
}
// let url_visitors_history_rx = /\/[a-z]+\/main\/unit\/view\/\d+\/visitors_history\/?/i;
//function isVisitorsHistory() {
//    return url_visitors_history_rx.test(document.location.pathname);
//}
// JQUERY ----------------------------------------
/**
 * Возвращает ближайшего родителя по имени Тэга
   работает как и closest. Если родитель не найден то не возвращает ничего для данного элемента
    то есть есть шанс что было 10 а родителей нашли 4 и их вернули.
 * @param items набор элементов JQuery
 * @param tagname имя тэга. tr, td, span и так далее
 */
function closestByTagName(items, tagname) {
    let tag = tagname.toUpperCase();
    let found = [];
    for (let i = 0; i < items.length; i++) {
        let node = items[i];
        while ((node = node.parentNode) && node.nodeName != tag) { }
        ;
        if (node)
            found.push(node);
    }
    return $(found);
}
/**
 * Для заданного элемента, находит все непосредственно расположенные в нем текстовые ноды и возвращает их текст.
   очень удобен для извлечения непосредственного текста из тэга БЕЗ текста дочерних нодов
 * @param item 1 объект типа JQuery
 */
function getOnlyText(item) {
    // просто children() не отдает текстовые ноды.
    let $childrenNodes = item.contents();
    let res = [];
    for (let i = 0; i < $childrenNodes.length; i++) {
        let el = $childrenNodes.get(i);
        if (el.nodeType === 3)
            res.push($(el).text()); // так как в разных браузерах текст запрашивается по разному, 
    }
    return res;
}
/**
 * Пробует найти ровно 1 элемент для заданного селектора. если не нашло или нашло больше валит ошибку
 * @param $item
 * @param selector
 */
function oneOrError($item, selector) {
    let $one = $item.find(selector);
    if ($one.length != 1)
        throw new Error(`Найдено ${$one.length} элементов вместо 1 для селектора ${selector}`);
    return $one;
}
// AJAX ----------------------------------------
/**
 * Отправляет запрос на установку нужной пагинации. Возвращает promice дальше делай с ним что надо.
 */
function doRepage(pages, $html) {
    // если не задать данные страницы, то считаем что надо использовать текущую
    if ($html == null)
        $html = $(document);
    // снизу всегда несколько кнопок для числа страниц, НО одна может быть уже нажата мы не знаем какая
    // берем просто любую ненажатую, извлекаем ее текст, на у далее в ссылке всегда
    // есть число такое же как текст в кнопке. Заменяем на свое и все ок.
    let $pager = $html.find('ul.pager_options li').has("a").last();
    let num = $pager.text().trim();
    let pagerUrl = $pager.find('a').attr('href').replace(num, pages.toString());
    // запросили обновление пагинации, дальше юзер решает что ему делать с этим
    let deffered = $.Deferred();
    $.get(pagerUrl)
        .done((data, status, jqXHR) => deffered.resolve(data))
        .fail((err) => deffered.reject("Не удалось установить пагинацию => " + err));
    return deffered.promise();
}
/**
 * Загружается указанную страницу используя заданное число повторов и таймаут. Так же можно задать
 * нужно ли убирать пагинацию или нет. Если нужно, то функция вернет страничку БЕЗ пагинации
 * @param url
 * @param retries число попыток
 * @param timeout
 * @param repage нужно ли убирать пагинацию
 */
function getPage(url, retries = 10, timeout = 1000, repage = true) {
    let deffered = $.Deferred();
    // сначала запросим саму страницу с перезапросом по ошибке
    tryGet(url, retries, timeout)
        .then((html) => {
        let locdef = $.Deferred();
        if (html == null) {
            locdef.reject("неизвестная ошибка. страница пришла пустая " + url);
            return locdef.promise();
        }
        // если страниц нет, то как бы не надо ничо репейджить
        // если не надо репейджить то тоже не будем
        let $html = $(html);
        if (!repage || !hasPages($html)) {
            deffered.resolve(html);
        }
        else {
            // репейджим
            let purl = getRepageUrl($html, 10000);
            if (purl == null)
                locdef.reject("не смог вытащить урл репейджа хотя он там должен быть");
            else
                locdef.resolve(purl);
        }
        return locdef.promise();
    }) // если нет репейджа все закончится тут
        .then((purl) => {
        let locdef = $.Deferred();
        tryGet(purl, retries, timeout)
            .done(() => locdef.resolve())
            .fail((err) => locdef.reject("ошибка репейджа => " + err));
        return locdef.promise();
    }) // запросим установку репейджа
        .then(() => tryGet(url, retries, timeout)) // снова запросим страницу
        .then((html) => deffered.resolve(html))
        .fail((err) => deffered.reject(err));
    return deffered.promise();
}
/**
 * Запрашивает страницу. При ошибке поробует повторить запрос через заданное число секунд.
 * Пробует заданное число попыток, после чего возвращает reject
 * @param url
 * @param retries число попыток загрузки
 * @param timeout таймаут между попытками
 */
function tryGet(url, retries = 10, timeout = 1000) {
    let $deffered = $.Deferred();
    $deffered.notify("0: " + url); // сразу даем уведомление, это работает. НО только 1 сработает если вызвать ДО установки прогресс хендлера на промис
    $.ajax({
        url: url,
        type: "GET",
        success: (data, status, jqXHR) => $deffered.resolve(data),
        error: function (jqXHR, textStatus, errorThrown) {
            retries--;
            if (retries <= 0) {
                $deffered.reject("Не смог загрузить страницу " + this.url);
                return;
            }
            logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
            let _this = this;
            setTimeout(() => {
                $deffered.notify("0: " + url); // уведомляем об очередном запросе
                $.ajax(_this);
            }, timeout);
        }
    });
    return $deffered.promise();
}
/**
 * Запрашивает страницу. При ошибке поробует повторить запрос через заданное число секунд.
 * Пробует заданное число попыток, после чего возвращает reject.
 * При ресолве вернет текст страницы, а при реджекте вернет Error объект
 * @param url
 * @param retries число попыток загрузки
 * @param timeout таймаут между попытками
 * @param beforeGet вызывается перед каждым новым запросом. То есть число вызовов равно числу запросов. Каждый раз вызывается с урлом которые запрашивается.
 */
function tryGet_async(url, retries = 10, timeout = 1000, beforeGet, onError) {
    return __awaiter(this, void 0, void 0, function* () {
        logDebug(`tryGet_async: ${url}`);
        // сам метод пришлось делать Promise<any> потому что string | Error не работало какого то хуя не знаю. Из за стрик нулл чек
        let $deffered = $.Deferred();
        if (beforeGet) {
            try {
                beforeGet(url);
            }
            catch (err) {
                logDebug("beforeGet вызвал исключение", err);
            }
        }
        $.ajax({
            url: url,
            type: "GET",
            success: (data, status, jqXHR) => $deffered.resolve(data),
            error: function (jqXHR, textStatus, errorThrown) {
                if (onError) {
                    try {
                        onError(url);
                    }
                    catch (err) {
                        logDebug("onError вызвал исключение", err);
                    }
                }
                retries--;
                if (retries <= 0) {
                    let err = new Error(`can't get ${this.url}\nstatus: ${jqXHR.status}\ntextStatus: ${jqXHR.statusText}\nerror: ${errorThrown}`);
                    $deffered.reject(err);
                    return;
                }
                //logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
                let _this = this;
                setTimeout(() => {
                    if (beforeGet) {
                        try {
                            beforeGet(url);
                        }
                        catch (err) {
                            logDebug("beforeGet вызвал исключение", err);
                        }
                    }
                    $.ajax(_this);
                }, timeout);
            }
        });
        return $deffered.promise();
    });
}
/**
 * Отправляет данные на сервер запросом POST. В остальном работает как и гет. Так же вернет промис который ресолвит с возвращенными данными
 * @param url
 * @param form данные для отправки на сервер
 * @param retries
 * @param timeout
 * @param beforePost
 */
function tryPost_async(url, form, retries = 10, timeout = 1000, beforePost, onError) {
    return __awaiter(this, void 0, void 0, function* () {
        // сам метод пришлось делать Promise<any> потому что string | Error не работало какого то хуя не знаю. Из за стрик нулл чек
        let $deferred = $.Deferred();
        if (beforePost) {
            try {
                beforePost(url);
            }
            catch (err) {
                logDebug("beforePost вызвал исключение", err);
            }
        }
        $.ajax({
            url: url,
            data: form,
            type: "POST",
            success: (data, status, jqXHR) => $deferred.resolve(data),
            error: function (jqXHR, textStatus, errorThrown) {
                if (onError) {
                    try {
                        onError(url);
                    }
                    catch (err) {
                        logDebug("onError вызвал исключение", err);
                    }
                }
                retries--;
                if (retries <= 0) {
                    let err = new Error(`can't post ${this.url}\nstatus: ${jqXHR.status}\ntextStatus: ${jqXHR.statusText}\nerror: ${errorThrown}`);
                    $deferred.reject(err);
                    return;
                }
                //logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
                let _this = this;
                setTimeout(() => {
                    if (beforePost) {
                        try {
                            beforePost(url);
                        }
                        catch (err) {
                            logDebug("beforePost вызвал исключение", err);
                        }
                    }
                    $.ajax(_this);
                }, timeout);
            }
        });
        return $deferred.promise();
    });
}
/**
 * Отправляет данные на сервер запросом POST. В остальном работает как и гет. Так же вернет промис который ресолвит с возвращенными данными
 * @param url
 * @param data данные для отправки на сервер
 * @param retries
 * @param timeout
 * @param beforePost
 */
function tryPostJSON_async(url, data, retries = 10, timeout = 1000, beforePost, onError) {
    return __awaiter(this, void 0, void 0, function* () {
        // сам метод пришлось делать Promise<any> потому что string | Error не работало какого то хуя не знаю. Из за стрик нулл чек
        let $deferred = $.Deferred();
        if (beforePost) {
            try {
                beforePost(url);
            }
            catch (err) {
                logDebug("beforePost вызвал исключение", err);
            }
        }
        $.ajax({
            url: url,
            data: data,
            type: "POST",
            dataType: 'JSON',
            success: (data, status, jqXHR) => $deferred.resolve(data),
            error: function (jqXHR, textStatus, errorThrown) {
                if (onError) {
                    try {
                        onError(url);
                    }
                    catch (err) {
                        logDebug("onError вызвал исключение", err);
                    }
                }
                retries--;
                if (retries <= 0) {
                    let err = new Error(`can't post ${this.url}\nstatus: ${jqXHR.status}\ntextStatus: ${jqXHR.statusText}\nerror: ${errorThrown}`);
                    $deferred.reject(err);
                    return;
                }
                //logDebug(`ошибка запроса ${this.url} осталось ${retries} попыток`);
                let _this = this;
                setTimeout(() => {
                    if (beforePost) {
                        try {
                            beforePost(url);
                        }
                        catch (err) {
                            logDebug("beforePost вызвал исключение", err);
                        }
                    }
                    $.ajax(_this);
                }, timeout);
            }
        });
        return $deferred.promise();
    });
}
// COMMON ----------------------------------------
let $xioDebug = false;
function logDebug(msg, ...args) {
    if (!$xioDebug)
        return;
    console.log(msg, ...args);
}
/**
 * определяет есть ли на странице несколько страниц которые нужно перелистывать или все влазит на одну
 * если не задать аргумента, будет брать текущую страницу
 * @param $html код страницы которую надо проверить
 */
function hasPages($html) {
    // если не задать данные страницы, то считаем что надо использовать текущую
    if ($html == null)
        $html = $(document);
    // там не только кнопки страниц но еще и текст Страницы в первом li поэтому > 2
    let $pageLinks = $html.find('ul.pager_list li');
    return $pageLinks.length > 2;
}
/**
 * Формирует ссылку на установку новой пагинации. Если страница не имеет пагинатора, вернет null
 * @param $html
 * @param pages число элементов на страницу которое установить
 */
function getRepageUrl($html, pages = 10000) {
    if (!hasPages($html))
        return null;
    // снизу всегда несколько кнопок для числа страниц, НО одна может быть уже нажата мы не знаем какая
    // берем просто любую ненажатую, извлекаем ее текст, на у далее в ссылке всегда
    // есть число такое же как текст в кнопке. Заменяем на свое и все ок.
    let $pager = $html.find('ul.pager_options li').has("a").last();
    let num = $pager.text().trim();
    return $pager.find('a').attr('href').replace(num, pages.toString());
}
// SAVE & LOAD ------------------------------------
/**
 * По заданным параметрам создает уникальный ключик использую уникальный одинаковый по всем скриптам префикс
 * @param realm реалм для которого сейвить. Если кросс реалмово, тогда указать null
 * @param code строка отличающая данные скрипта от данных другого скрипта
 * @param subid если для юнита, то указать. иначе пропустить
 */
function buildStoreKey(realm, code, subid) {
    if (code.length === 0)
        throw new RangeError("Параметр code не может быть равен '' ");
    if (realm != null && realm.length === 0)
        throw new RangeError("Параметр realm не может быть равен '' ");
    if (subid != null && realm == null)
        throw new RangeError("Как бы нет смысла указывать subid и не указывать realm");
    let res = "^*"; // уникальная ботва которую добавляем ко всем своим данным
    if (realm != null)
        res += "_" + realm;
    if (subid != null)
        res += "_" + subid;
    res += "_" + code;
    return res;
}
/**
 * Возвращает все ключи юнитов для заданного реалма и КОДА.
 * @param realm
 * @param storeKey код ключа sh, udd, vh итд
 */
function getStoredUnitsKeys(realm, storeKey) {
    let res = [];
    for (let key in localStorage) {
        // если в ключе нет числа, не брать его
        let m = extractIntPositive(key);
        if (m == null)
            continue;
        // если ключик не совпадает со старым ключем для посетителей
        let subid = m[0];
        if (key !== buildStoreKey(realm, storeKey, subid))
            continue;
        res.push(key);
    }
    return res;
}
/**
 * Выводит текстовое поле, куда выводит все ключи с содержимым в формате ключ=значение|ключи=значение...
 * @param test функция возвращающая ИСТИНУ если данный ключик надо экспортить, иначе ЛОЖЬ
 * @param $place элемент страницы в который будет добавлено текстовое поле для вывода
 */
function Export($place, test) {
    if ($place.length <= 0)
        return false;
    if ($place.find("#txtExport").length > 0) {
        $place.find("#txtExport").remove();
        return false;
    }
    let $txt = $('<textarea id="txtExport" style="display:block;width: 800px; height: 200px"></textarea>');
    let string = "";
    for (let key in localStorage) {
        if (!test(key))
            continue;
        if (string.length > 0)
            string += "|";
        string += `${key}=${localStorage[key]}`;
    }
    $txt.text(string);
    $place.append($txt);
    return true;
}
/**
 * Импортирует в кэш данные введенные к текстовое окно. Формат данных такой же как в экспорте
 * Ключ=Значение|Ключ=Значение итд.
 * Если что то не заладится, будет выпадать с ошибкой. Существующие ключи перезаписывает, с уведомление в консоли
 * @param $place элемент страницы в который будет добавлено текстовое поле для ввода
 */
function Import($place) {
    if ($place.length <= 0)
        return false;
    if ($place.find("#txtImport").length > 0) {
        $place.find("#txtImport").remove();
        $place.find("#saveImport").remove();
        return false;
    }
    let $txt = $('<textarea id="txtImport" style="display:block;width: 800px; height: 200px"></textarea>');
    let $saveBtn = $(`<input id="saveImport" type=button disabled="true" value="Save!">`);
    $txt.on("input propertychange", (event) => $saveBtn.prop("disabled", false));
    $saveBtn.on("click", (event) => {
        let items = $txt.val().split("|"); // элементы вида Ключ=значение
        logDebug(`загружено ${items.length} элементов`);
        try {
            items.forEach((val, i, arr) => {
                let item = val.trim();
                if (item.length <= 0)
                    throw new Error(`получили пустую строку для элемента ${i}, невозможно импортировать.`);
                let kvp = item.split("="); // пара ключ значение
                if (kvp.length !== 2)
                    throw new Error("Должен быть только ключ и значение а по факту не так. " + item);
                let storeKey = kvp[0].trim();
                let storeVal = kvp[1].trim();
                if (storeKey.length <= 0 || storeVal.length <= 0)
                    throw new Error("Длина ключа или данных равна 0 " + item);
                if (localStorage[storeKey])
                    logDebug(`Ключ ${storeKey} существует. Перезаписываем.`);
                localStorage[storeKey] = storeVal;
            });
            alert("импорт завершен");
        }
        catch (err) {
            let msg = err.message;
            alert(msg);
        }
    });
    $place.append($txt).append($saveBtn);
    return true;
}
/// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
let Realm = getRealmOrError();
var Modes;
(function (Modes) {
    Modes[Modes["none"] = 0] = "none";
    Modes[Modes["self"] = 1] = "self";
    Modes[Modes["other"] = 2] = "other";
})(Modes || (Modes = {}));
function run() {
    let start = performance.now();
    let elapsed = 0;
    let $ = jQuery;
    let realm = getRealm();
    let mode = Modes.none;
    let $unitTop = $("#mainContent > table.unit-top");
    //let $unitList = $("#mainContent > table.unit-list-2014");
    let $unitList = $("table.unit-list-2014"); // на чужом window списке нет хедера с id
    if (isMyUnitList())
        mode = Modes.self;
    if (isOthersUnitList())
        mode = Modes.other;
    // закончить если мы не на той странице
    if (mode === Modes.none) {
        console.log("management: not on unit list page.");
        return;
    }
    // работа
    let $rows = closestByTagName($unitList.find("td.unit_id"), "tr");
    let units = parseUnits($rows, mode);
    let townRegDict = makeRegTownDict(units); // словарь чтобы удобно было найти связь город страна
    let inProcess = { Count: 0, Finally: () => { } }; // счетчик запущенных запросов по эффективности. когда закончится выполняет Finally 
    if (mode === Modes.self) {
        // поиск эффективности и подсветка красным всего что не 100%
        efficiencyColor(units);
        // клик на эффективность
        efficiencyClick(units);
        // сокращенный размер для размеров подразделений
        resizeSizeColumn();
        // Перемещаем создать подразделение в одну строку с типа подразделений
        moveCreateBtn();
        // удалим панельку селектов. наш фильтр ее заменяет полностью
        $unitTop.find("select.unittype").hide();
    }
    // удаляем в строке с названиями, вторую строку о числе работников, и размере складов и так далее.
    //unitList.find("td.info").each(function () { $(this).children().not("a").remove(); });
    // создаем панельку, и шоутайм.
    let $panel = buildFilterPanel();
    if (mode === Modes.self)
        $panel.wrapAll("<tr><td colspan=3></td></tr>").closest("tr").insertAfter($unitTop.find("tr:last-child"));
    else
        $panel.wrapAll("<div></div>").closest("div").insertBefore($unitList);
    $panel.show();
    pager(); // вставлять именно после панели. иначе глюки
    elapsed = (performance.now() - start) / 1000;
    console.log(`manager: ${$rows.length} units parsed  in ${elapsed.toPrecision(3)} sec.`);
    // Функции
    //
    // формирует стиль для столбца с размером подразделения чтобы он меньше занимал места
    function getStyle() {
        var out = "<style>";
        out += ".tchk {";
        out += "padding: 0px; background: #D8D8D8; float:left; height: 6px; width: 6px; margin: 1px;";
        out += "}";
        out += ".geocombo {";
        out += "background-position: 2px 50%; background-repeat: no-repeat; padding-left: 20px;";
        out += "}";
        out += "</style>";
        return out;
    }
    // вставляет пагинацию до 20000 если ее нет на странице
    function pager() {
        let $pager = $("ul.pager_options");
        if ($pager.text().indexOf("20000") < 0) {
            let $template = $pager.find("li").has("a").eq(0);
            let number = getOnlyText($template.find("a").eq(0))[0].trim();
            let optHtml = [];
            for (let pages of [1000, 2000, 4000, 10000, 20000]) {
                let newOptHtml = $template[0].outerHTML.replace(new RegExp(number, "ig"), pages.toString());
                optHtml.push(newOptHtml);
            }
            $pager.append(optHtml.join(" "));
        }
        $unitList.before($pager.clone().add($("ul.pager_list").clone()));
    }
    // подсветка красным эффективности меньше 100
    function efficiencyColor(units) {
        for (let i = 0; i < units.length; i++)
            if (units[i].Efficiency < 100)
                units[i].$eff.css("color", 'red');
    }
    // сокращенный размер для размеров подразделений
    function resizeSizeColumn() {
        let $sizeColumnHeader = $unitList.find("div.field_title").eq(3);
        //console.log(sizeColumnHeader);
        let newHeader = $sizeColumnHeader.html().replace("Размер", "Р.");
        $sizeColumnHeader.html(newHeader);
        $sizeColumnHeader.attr("title", "размер подраздления (от 1 до 6)");
    }
    // перемещает кнопку создания нового юнита чтобы она занимала меньше места
    function moveCreateBtn() {
        let typeToolbar = $unitTop.find("td.u-l");
        // бывает что нет панели с кнопками юнитов, тогда оставим все как есть
        if (typeToolbar.length === 0)
            return;
        // скроем большую кнопку
        var btn = $unitTop.find("a.btn-success");
        btn.hide();
        // забираем картинку с кнопки и создаем новую миникнопку
        var btnImg = btn.find("img.img_button");
        var newBtn = "<a href=" + btn.attr('href') + " title='Создать подразделение'><img src=" + btnImg.attr('src') + "></a>";
        typeToolbar.append(newBtn);
    }
    // делает фильтрацию
    function doFilter($panel) {
        let op = getFilterOptions($panel, mode);
        let filterMask = filter(units, op, mode);
        let cnt = 0;
        for (let i = 0; i < units.length; i++) {
            let unit = units[i];
            let $commentRow = unit.$row.next("tr.unit_comment");
            if (filterMask[i]) {
                cnt++;
                unit.$row.show();
                if ($commentRow.length > 0)
                    $commentRow.show();
            }
            else {
                unit.$row.hide();
                if ($commentRow.length > 0)
                    $commentRow.hide();
            }
        }
        $panel.find("#rows").text(`[${cnt}]`);
    }
    function buildFilterPanel() {
        function buildOptions(items) {
            let optionsHtml = '<option value="all", label="all">all</option>';
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                let lbl = item.Count > 1 ? `label="${item.Name} (${item.Count})"` : `label="${item.Name}"`;
                let val = `value="${item.Value}"`;
                let txt = item.Name;
                let html = `<option ${lbl} ${val}>${txt}</option>`;
                optionsHtml += html;
            }
            return optionsHtml;
        }
        // если панели еще нет, то добавить её
        let style = {
            padding: "2px",
            border: "1px solid #0184D0",
            "border-radius": "4px 4px 4px 4px",
            float: "left",
            "white-space": "nowrap",
            color: "#0184D0",
            display: "none",
            width: "100%"
        };
        let panelHtml = `
            <div id='filterPanel' >
                <table>
                <tbody>
                    <tr><td id="f_row1"></td></tr>
                    <tr><td id="f_row2"></td></tr>
                </tbody>
                </table>
            </div>`;
        let $panel = $(panelHtml);
        $panel.css(style);
        // фильтр по регионам
        let regionFilter = $("<select id='regionFilter' class='option' style='max-width:120px;'>");
        let regions = makeKeyValCount(units, (el) => el.Region);
        regionFilter.append(buildOptions(regions));
        // фильтр по городам
        let townFilter = $("<select id='townFilter' class='option' style='max-width:120px;'>");
        let towns = makeKeyValCount(units, (el) => el.Town);
        townFilter.append(buildOptions(towns));
        // фильтр по типам
        let typeFilter = $("<select id='typeFilter' class='option' style='max-width:120px;'>");
        let types = makeKeyValCount(units, (el) => el.Type);
        typeFilter.append(buildOptions(types));
        // фильтр по товарам
        let goodsFilter = $("<select id='goodsFilter' class='option' style='max-width:120px;'>");
        goodsFilter.append(buildOptions(getGoods(units)));
        // фильтр по проблемам
        let problemsFilter = $("<select id='problemsFilter' class='option' style='max-width:120px;'>");
        problemsFilter.append(buildOptions(getProblems(units)));
        // фильтр по эффективности
        let efficiencyFilter = $("<select id='efficiencyFilter' class='option' style='max-width:50px;'>")
            .append('<option value=-1>all</option>')
            .append('<option value=100>100%</option>') // ТОЛЬКО 100%
            .append('<option value=10>< 100%</option>') // [0, 100%) - нерабочие НЕ выводить
            .append('<option value=0>0%</option>');
        // фильтр по тегм
        let tagFilter = $("<select id='tagFilter' class='option' style='max-width:120px;'>");
        let taggedUnits = units.filter((val, i, arr) => val.Tag.length > 0);
        let tags = makeKeyValCount(taggedUnits, (el) => el.Tag);
        tagFilter.append(buildOptions(tags));
        // текстовый фильтр
        let textFilter = $("<input id='textFilter' class='option' style='width:50%;'></input>").attr({ type: 'text', value: '(?=.*)' });
        // запрос сразу всех данных по эффективности
        let effButton = $("<input type=button id=getEff value='GO'>").css("color", "red");
        // события смены фильтров
        //
        // делегируем все события на панель
        $panel.on("change", ".option", function (event) {
            let $el = $(event.target);
            // смена региона сбросит город
            if ($el.is(regionFilter))
                townFilter.val("all");
            // смена города выставит регион в тот который надо для города
            if ($el.is(townFilter)) {
                let twn = $el.val();
                let reg = twn === "all" ? "all" : townRegDict[twn];
                regionFilter.val(reg);
            }
            doFilter($panel);
        });
        $panel.on("dblclick", ".option", function (event) {
            let $el = $(event.target);
            if ($el.is("select")) {
                $el.prop('selectedIndex', 0);
                $el.change();
            }
        });
        effButton.click(function () {
            return __awaiter(this, void 0, void 0, function* () {
                let $btn = $(this);
                $btn.prop('disabled', true).css("color", "gray");
                // берем только видимые строки
                let filterMask = filter(units, getFilterOptions($panel, mode), mode);
                let rows = units
                    .filter((val, i) => filterMask[i])
                    .map(val => val.$row);
                // формируем общий объект
                let $rows = $();
                for (let r of rows)
                    $rows = $rows.add(r);
                yield updateEff_async($rows);
                $btn.prop('disabled', false).css("color", "red");
            });
        });
        // дополняем панель до конца элементами
        //
        let $r1 = $panel.find("#f_row1");
        let $r2 = $panel.find("#f_row2");
        $r1.append("<span>Рег: </span>").append(regionFilter);
        $r1.append("<span> Гор: </span>").append(townFilter);
        $r1.append("<span> Тип: </span>").append(typeFilter);
        $r1.append("<span> Тов: </span>").append(goodsFilter);
        if (mode === Modes.self) {
            $r1.append("<span> Алерт: </span>").append(problemsFilter);
            $r1.append("<span> Эф: </span>").append(efficiencyFilter);
            $r1.append("<span> </span>").append(effButton);
        }
        $r2.append("<span> Тэг#: </span>").append(tagFilter);
        $r2.append("<span> Rx: </span>").append(textFilter);
        $r2.append("<span id='rows' style='color: blue;'></span>");
        return $panel;
    }
    function efficiencyClick(units) {
        for (let i = 0; i < units.length; i++)
            units[i].$eff.css("cursor", "pointer").prop("title", "Узнать прогноз эффективности");
        $unitList.on("click", "td.prod", function () {
            let $td = $(this);
            updateEff_async($td.closest("tr"));
        });
    }
}
function updateEff_async($rows) {
    return __awaiter(this, void 0, void 0, function* () {
        let subids = [];
        // ставис статус что в обработке и картинку загрузки данных
        // так же собираем subid, НО только те которые сейчас не запрашиваются еще. избегаем двойного запроса
        $rows.each((i, el) => {
            let $r = $(el);
            if ($r.hasClass("processing"))
                return;
            let subid = numberfyOrError(oneOrError($r, "td.unit_id").text());
            subids.push(subid);
            oneOrError($r, "td.prod").empty().append($("<img>").attr({ src: "https://raw.githubusercontent.com/ra81/management/master/loader.gif", height: 16, width: 16 }).css('padding-right', '20px'));
            $r.attr("data-subid", subid);
            $r.addClass("processing");
        });
        for (let subid of subids) {
            let percent = yield xforecast_async(subid);
            let $r = $rows.filter(`tr[data-subid=${subid}]`);
            if ($r.length != 1)
                throw new Error("что то пошло не так. нашел много строк с subid:" + subid);
            // выставляем значение в ячейку
            let color = (percent >= 100 ? 'green' : 'red');
            oneOrError($r, "td.prod")
                .html(percent.toFixed(2) + "<i>%</i>")
                .css('color', color);
            // зачищаем ненужные данные со строки
            $r.removeAttr("data-subid");
            $r.removeClass("processing");
        }
        //// запрашиваем эффективность по каждому юниту и обновляем данные на странице по мере прихода
        //await getEff_async(subids, (dict) => {
        //    for (let key in dict) {
        //        let subid = parseInt(key);
        //        let percent = dict[subid];
        //        let $r = $rows.filter(`tr[data-subid=${subid}]`);
        //        if ($r.length != 1)
        //            throw new Error("что то пошло не так. нашел много строк с subid:" + subid);
        //        // выставляем значение в ячейку
        //        let color = (percent >= 100 ? 'green' : 'red');
        //        oneOrError($r, "td.prod")
        //            .html(percent.toFixed(2) + "<i>%</i>")
        //            .css('color', color);
        //        // зачищаем ненужные данные со строки
        //        $r.removeAttr("data-subid");
        //        $r.removeClass("processing");
        //    }
        //});
    });
}
/**
 * Запрашивает эффективность для заданного списка. Если много элементов то будет порционно выдавать результаты
   через коллбэк
 * @param subids
 * @param onPartDone
 */
function getEff_async(subids, onPartDone) {
    return __awaiter(this, void 0, void 0, function* () {
        if (subids == null)
            throw new Error(`subids == null`);
        console.log("запрашиваю для ", subids);
        let realm = getRealmOrError();
        const psize = 5;
        let i = 0;
        let part = [];
        do {
            // берем порцию. если вылезем за край массива то будет пустой срез
            part = subids.slice(i, i + psize);
            i += psize;
            // запрашиваем для нее данные
            let waitList = [];
            for (let n = 0; n < part.length; n++) {
                let promise = tryGet_async(`/${realm}/window/unit/productivity_info/${part[n]}`);
                waitList.push(promise);
            }
            let htmlList = yield Promise.all(waitList);
            // обработка и вытаскивание эффективности
            let res = {};
            for (let n = 0; n < part.length; n++) {
                let percent = $(htmlList[n]).find('td:contains("Эффективность работы") + td td:eq(1)').text().replace('%', '').trim();
                res[part[n]] = numberfyOrError(percent, -1);
            }
            onPartDone(res);
        } while (part.length > 0);
    });
}
/**
 * запрос прогноза для 1 юнита ajax
 * @param subid
 */
function xforecast_async(subid) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield tryPostJSON_async(`/${Realm}/ajax/unit/forecast`, { 'unit_id': subid });
        if (data['productivity'] == null)
            throw new Error("Не пришли данные по продуктивности для юнита " + subid);
        return Math.min(data['productivity'], 1) * 100;
    });
}
function parseUnits($rows, mode) {
    let units = [];
    let parseImgs = ($imgs) => {
        let res = [];
        for (let m = 0; m < $imgs.length; m++)
            res.push({
                Name: $imgs.eq(m).attr("title").trim(),
                Url: $imgs.eq(m).attr("src")
            });
        return res;
    };
    let nameUrlToString = (items) => {
        let str = " ";
        for (let i = 0; i < items.length; i++)
            str += items[i].Name + " " + items[i].Url + " ";
        return str;
    };
    // через полный конвейр map 68 секунд
    // через нахождение ячеек из рядов и затем допарсинг так же
    // если сразу искать $(td.unit_id) и потом допарсивать в цикле то так же как по рядам.
    // просто по рядам 17 сек на 10к строк. приемлемо
    for (let i = 0; i < $rows.length; i++) {
        let $r = $rows.eq(i);
        let searchStr = "";
        let id = numberfy($r.find("td.unit_id").text()); // внутри триммится
        searchStr += id;
        let $geo = $r.find("td.geo");
        let reg = $geo.attr("title").trim();
        let twn = $geo.text().trim();
        searchStr += " " + reg + " " + twn;
        let $info = $r.find("td.info");
        let $link = $info.find("a");
        let name = $link.text();
        let url = $link.attr("href");
        let type = $info.attr("title");
        let category = $info.attr("class").split("-")[1];
        searchStr += " " + name + " " + url + " " + type + " " + category;
        //let goods = $r.find("td.spec").find("img").map(parseImg).get() as any as INameUrl[];
        let $tdSpec = $r.find("td.spec");
        let $goods = $tdSpec.find("img");
        let goods = parseImgs($goods);
        searchStr += " " + nameUrlToString(goods) + " " + $tdSpec.attr("title");
        // на чужой странице нет проблем и эффективностей
        let problems = [];
        let $eff = $("<br/>");
        let eff = -1;
        if (mode === Modes.self) {
            let $problems = $r.find("td.alerts").find("img");
            problems = parseImgs($problems);
            searchStr += " " + nameUrlToString(problems);
            $eff = $r.find("td.prod");
            eff = numberfy($eff.clone().children().remove().end().text());
            searchStr += " " + eff;
        }
        // для юнитов можно в имени ставить тег вида gas#чтото еще дальше
        // спарсим тег, либо "" если его нет
        let tg = tag(name);
        units.push({
            $row: $r,
            Id: id,
            Region: reg,
            Town: twn,
            Name: name,
            Tag: tg,
            Url: url,
            Type: type,
            Goods: goods,
            Problems: problems,
            Efficiency: eff,
            $eff: $eff,
            SearchString: searchStr
        });
    }
    return units;
}
// выделяет из строки так вида tag#чтотоеще. Если такого нет возвращает ""
function tag(str) {
    let rx = /^([a-z,0-9]+)#.+/i;
    let items = rx.exec(str);
    return items ? items[1] : "";
}
// возвращает массив равный числу юнитов. В ячейке true если юнита надо показывать. иначе false
function filter(units, options, mode) {
    let res = [];
    let textRx = new RegExp(options.TextRx, "i");
    for (let i = 0; i < units.length; i++) {
        let unit = units[i];
        res[i] = false;
        if (options.Region != "all" && unit.Region != options.Region)
            continue;
        if (options.Town != "all" && unit.Town != options.Town)
            continue;
        if (options.Type != "all" && unit.Type != options.Type)
            continue;
        if (options.Tag != "all" && unit.Tag != options.Tag)
            continue;
        if (textRx.test(unit.SearchString) === false)
            continue;
        if (options.GoodUrl != "all" && !unit.Goods.some((e) => e.Url === options.GoodUrl))
            continue;
        if (mode === Modes.self) {
            if (options.ProblemUrl != "all" && !unit.Problems.some((e) => e.Url === options.ProblemUrl))
                continue;
            switch (options.Efficiency) {
                case 100:
                    if (unit.Efficiency < 100)
                        continue;
                    break;
                case 10:
                    if (unit.Efficiency >= 100 || unit.Efficiency < 0)
                        continue;
                    break;
                case 0:
                    if (unit.Efficiency > 0)
                        continue;
                    break;
                case -1:
                    break;
            }
        }
        res[i] = true;
    }
    return res;
}
function getFilterOptions($panel, mode) {
    return {
        Region: $panel.find("#regionFilter").val(),
        Town: $panel.find("#townFilter").val(),
        Type: $panel.find("#typeFilter").val(),
        Tag: $panel.find("#tagFilter").val(),
        TextRx: $panel.find("#textFilter").val().toLowerCase(),
        GoodUrl: $panel.find("#goodsFilter").val(),
        ProblemUrl: mode === Modes.self ? $panel.find("#problemsFilter").val() : "",
        Efficiency: mode === Modes.self ? numberfy($panel.find("#efficiencyFilter").val()) : -1,
    };
}
function getGoods(units) {
    let goods = [];
    for (let i = 0; i < units.length; i++)
        goods.push.apply(goods, units[i].Goods);
    return makeKeyValCount(goods, (el) => el.Name, (el) => el.Url);
}
function getProblems(units) {
    let problems = [];
    for (let i = 0; i < units.length; i++)
        problems.push.apply(problems, units[i].Problems);
    return makeKeyValCount(problems, (el) => el.Name, (el) => el.Url);
}
function makeKeyValCount(items, keySelector, valueSelector) {
    let res = {};
    for (let i = 0; i < items.length; i++) {
        let key = keySelector(items[i]);
        let val = valueSelector ? valueSelector(items[i]) : key;
        if (res[key] != null)
            res[key].Count++;
        else
            res[key] = { Name: key, Value: val, Count: 1 };
    }
    let resArray = [];
    for (let key in res)
        resArray.push(res[key]);
    resArray.sort(function (a, b) {
        if (a.Name > b.Name)
            return 1;
        if (a.Name < b.Name)
            return -1;
        return 0;
    });
    return resArray;
}
function makeRegTownDict(units) {
    let res = {};
    for (let i = 0; i < units.length; i++) {
        let town = units[i].Town;
        if (res[town] != null)
            if (res[town] !== units[i].Region)
                throw new Error("что то пошло не так. У одного города разные регионы у юнитов.");
        res[town] = units[i].Region;
    }
    return res;
}
$(document).ready(() => run());
