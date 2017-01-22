// ==UserScript==
// @name           Virtonomica: management
// @namespace      https://github.com/ra81/management
// @version 	   1.72
// @description    Добавление нового функционала к управлению предприятиями
// @include        https://*virtonomic*.*/*/main/company/view/*
// @require        https://code.jquery.com/jquery-3.1.1.min.js
// @noframes
// ==/UserScript== 
// 
// Набор вспомогательных функций для использования в других проектах. Универсальные
//   /// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
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
    var newItems = [];
    for (var key in dict)
        newItems.push(key + ":" + dict[key].toString());
    return newItems.join(", ");
}
/**
 * Проверяет что элемент есть в массиве.
 * @param item
 * @param arr массив НЕ null
 */
function isOneOf(item, arr) {
    return arr.indexOf(item) >= 0;
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
    var rx = new RegExp(/https:\/\/virtonomic[A-Za-z]+\.[a-zA-Z]+\/([a-zA-Z]+)\/.+/ig);
    var m = rx.exec(document.location.href);
    if (m == null)
        return null;
    return m[1];
}
/**
 * Парсит id компании со страницы
 */
function getCompanyId() {
    var str = matchedOrError($("a.dashboard").attr("href"), /\d+/);
    return numberfyOrError(str);
}
/**
 * Оцифровывает строку. Возвращает всегда либо число или Number.POSITIVE_INFINITY либо -1 если отпарсить не вышло.
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
        var n = parseFloat(cleanStr(String(str)));
        return isNaN(n) ? -1 : n;
    }
}
/**
 * Пробуем оцифровать данные но если они выходят как Number.POSITIVE_INFINITY или <= minVal, валит ошибку.
   смысл в быстром вываливании ошибки если парсинг текста должен дать число
 * @param value строка являющая собой число больше minVal
 * @param minVal ограничение снизу. Число.
 * @param infinity разрешена ли бесконечность
 */
function numberfyOrError(str, minVal, infinity) {
    if (minVal === void 0) { minVal = 0; }
    if (infinity === void 0) { infinity = false; }
    var n = numberfy(str);
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
    var m = str.match(rx);
    if (m == null)
        throw new Error(errMsg || "\u041F\u0430\u0442\u0442\u0435\u0440\u043D " + rx + " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 " + str);
    if (m.length > 1)
        throw new Error(errMsg || "\u041F\u0430\u0442\u0442\u0435\u0440\u043D " + rx + " \u043D\u0430\u0439\u0434\u0435\u043D \u0432 " + str + " " + m.length + " \u0440\u0430\u0437 \u0432\u043C\u0435\u0441\u0442\u043E \u043E\u0436\u0438\u0434\u0430\u0435\u043C\u043E\u0433\u043E 1");
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
    var m = rx.exec(str);
    if (m == null)
        throw new Error(errMsg || "\u041F\u0430\u0442\u0442\u0435\u0440\u043D " + rx + " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 " + str);
    return m;
}
/**
 * из строки пробует извлечь все вещественные числа. Рекомендуется применять ТОЛЬКО для извлечения из текстовых строк.
 * для простого парсинга числа пойдет numberfy
 * Если их нет вернет null
 * @param str
 */
function extractFloatPositive(str) {
    var m = cleanStr(str).match(/\d+\.\d+/ig);
    if (m == null)
        return null;
    var n = m.map(function (i, e) { return numberfyOrError($(e).text(), -1); });
    return n;
}
var urlUnitMainRx = /\/\w+\/main\/unit\/view\/\d+\/?$/i;
var urlTradeHallRx = /\/[a-z]+\/main\/unit\/view\/\d+\/trading_hall\/?/i;
var urlVisitorsHistoryRx = /\/[a-z]+\/main\/unit\/view\/\d+\/visitors_history\/?/i;
function isMyUnitList() {
    // для ссылки обязательно завершающий unit_list мы так решили
    var rx = /\/\w+\/main\/company\/view\/\d+\/unit_list\/?$/ig;
    if (rx.test(document.location.pathname) === false)
        return false;
    // помимо ссылки мы можем находиться на чужой странице юнитов
    if ($("#mainContent > table.unit-top").length === 0
        || $("#mainContent > table.unit-list-2014").length === 0)
        return false;
    return true;
}
function isUnitMain() {
    return urlUnitMainRx.test(document.location.pathname);
}
function isShop() {
    var $a = $("ul.tabu a[href$=trading_hall]");
    return $a.length === 1;
}
function isVisitorsHistory() {
    return urlVisitorsHistoryRx.test(document.location.pathname);
}
// JQUERY ----------------------------------------
/**
 * Возвращает ближайшего родителя по имени Тэга
   работает как и closest. Если родитель не найден то не возвращает ничего для данного элемента
    то есть есть шанс что было 10 а родителей нашли 4 и их вернули.
 * @param items набор элементов JQuery
 * @param tagname имя тэга. tr, td, span и так далее
 */
function closestByTagName(items, tagname) {
    var tag = tagname.toUpperCase();
    var found = [];
    for (var i = 0; i < items.length; i++) {
        var node = items[i];
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
    var $childrenNodes = item.contents();
    var res = [];
    for (var i = 0; i < $childrenNodes.length; i++) {
        var el = $childrenNodes.get(i);
        if (el.nodeType === 3)
            res.push($(el).text()); // так как в разных браузерах текст запрашивается по разному, 
    }
    return res;
}
// COMMON ----------------------------------------
var $xioDebug = false;
function logDebug(msg) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (!$xioDebug)
        return;
    if (args.length === 0)
        console.log(msg);
    else
        console.log(msg, args);
}
/// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />
var Modes;
(function (Modes) {
    Modes[Modes["none"] = 0] = "none";
    Modes[Modes["self"] = 1] = "self";
    Modes[Modes["other"] = 2] = "other";
})(Modes || (Modes = {}));
function run() {
    var start = performance.now();
    var elapsed = 0;
    var $ = jQuery;
    var realm = getRealm();
    var mode = Modes.none;
    var $unitTop = $("#mainContent > table.unit-top");
    var $unitList = $("#mainContent > table.unit-list-2014");
    var $imgOther = $("#mainContent img[src='/img/icon/add_2_clist.gif']");
    if ($unitTop.length > 0 && $unitList.length > 0)
        mode = Modes.self;
    if ($unitList.length > 0 && $imgOther.length > 0)
        mode = Modes.other;
    // закончить если мы не на той странице
    if (mode === Modes.none) {
        console.log("management: not on unit list page.");
        return;
    }
    // работа
    var $rows = closestByTagName($unitList.find("td.unit_id"), "tr");
    var units = parseUnits($rows, mode);
    var townRegDict = makeRegTownDict(units); // словарь чтобы удобно было найти связь город страна
    var inProcess = { Count: 0, Finally: function () { } }; // счетчик запущенных запросов по эффективности. когда закончится выполняет Finally 
    if (mode === Modes.self) {
        // поиск эффективности и подсветка красным всего что не 100%
        efficiencyColor(units);
        // клик на эффективность
        efficiencyClick(units);
        // сокращенный размер для размеров подразделений
        resizeSizeColumn();
        // Перемещаем создать подразделение в одну строку с типа подразделений
        moveCreateBtn();
    }
    // удаляем в строке с названиями, вторую строку о числе работников, и размере складов и так далее.
    //unitList.find("td.info").each(function () { $(this).children().not("a").remove(); });
    // создаем панельку, и шоутайм.
    var $panel = buildFilterPanel();
    if (mode === Modes.self)
        $panel.wrapAll("<tr><td colspan=3></td></tr>").closest("tr").insertAfter($unitTop.find("tr:last-child"));
    else
        $panel.wrapAll("<div></div>").closest("div").insertBefore($unitList);
    $panel.show();
    elapsed = (performance.now() - start) / 1000;
    console.log("manager: " + $rows.length + " units parsed  in " + elapsed.toPrecision(3) + " sec.");
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
    // подсветка красным эффективности меньше 100
    function efficiencyColor(units) {
        for (var i = 0; i < units.length; i++)
            if (units[i].Efficiency < 100)
                units[i].$eff.css("color", 'red');
    }
    // сокращенный размер для размеров подразделений
    function resizeSizeColumn() {
        var $sizeColumnHeader = $unitList.find("div.field_title").eq(3);
        //console.log(sizeColumnHeader);
        var newHeader = $sizeColumnHeader.html().replace("Размер", "Р.");
        $sizeColumnHeader.html(newHeader);
        $sizeColumnHeader.attr("title", "размер подраздления (от 1 до 6)");
    }
    // перемещает кнопку создания нового юнита чтобы она занимала меньше места
    function moveCreateBtn() {
        var typeToolbar = $unitTop.find("td.u-l");
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
        var op = getFilterOptions($panel, mode);
        var filterMask = filter(units, op, mode);
        var cnt = 0;
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            var $commentRow = unit.$row.next("tr.unit_comment");
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
        $panel.find("#rows").text("[" + cnt + "]");
    }
    function buildFilterPanel() {
        function buildOptions(items) {
            var optionsHtml = '<option value="all", label="all">all</option>';
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var lbl = item.Count > 1 ? "label=\"" + item.Name + " (" + item.Count + ")\"" : "label=\"" + item.Name + "\"";
                var val = "value=\"" + item.Value + "\"";
                var txt = item.Name;
                var html = "<option " + lbl + " " + val + ">" + txt + "</option>";
                optionsHtml += html;
            }
            return optionsHtml;
        }
        // если панели еще нет, то добавить её
        var panelHtml = "<div id='filterPanel' style='padding: 2px; border: 1px solid #0184D0; border-radius: 4px 4px 4px 4px; float:left; white-space:nowrap; color:#0184D0; display:none;'></div>";
        var $panel = $(panelHtml);
        // фильтр по регионам
        var regionFilter = $("<select id='regionFilter' class='option' style='max-width:100px;'>");
        var regions = makeKeyValCount(units, function (el) { return el.Region; });
        regionFilter.append(buildOptions(regions));
        // фильтр по городам
        var townFilter = $("<select id='townFilter' class='option' style='max-width:100px;'>");
        var towns = makeKeyValCount(units, function (el) { return el.Town; });
        townFilter.append(buildOptions(towns));
        // фильтр по типам
        var typeFilter = $("<select id='typeFilter' class='option' style='max-width:100px;'>");
        var types = makeKeyValCount(units, function (el) { return el.Type; });
        typeFilter.append(buildOptions(types));
        // фильтр по товарам
        var goodsFilter = $("<select id='goodsFilter' class='option' style='max-width:100px;'>");
        goodsFilter.append(buildOptions(getGoods(units)));
        // фильтр по проблемам
        var problemsFilter = $("<select id='problemsFilter' class='option' style='max-width:100px;'>");
        problemsFilter.append(buildOptions(getProblems(units)));
        // фильтр по эффективности
        var efficiencyFilter = $("<select id='efficiencyFilter' class='option' style='max-width:50px;'>")
            .append('<option value=-1>all</option>')
            .append('<option value=100>100%</option>') // ТОЛЬКО 100%
            .append('<option value=10>< 100%</option>') // [0, 100%) - нерабочие НЕ выводить
            .append('<option value=0>0%</option>');
        // текстовый фильтр
        var textFilter = $("<input id='textFilter' class='option' style='max-width:100px;'></input>").attr({ type: 'text', value: '' });
        // запрос сразу всех данных по эффективности
        var effButton = $("<input type=button id=getEff value='GO'>").css("color", "red");
        // события смены фильтров
        //
        // делегируем все события на панель
        $panel.on("change", ".option", function (event) {
            var $el = $(event.target);
            // смена региона сбросит город
            if ($el.is(regionFilter))
                townFilter.val("all");
            // смена города выставит регион в тот который надо для города
            if ($el.is(townFilter)) {
                var twn = $el.val();
                var reg = twn === "all" ? "all" : townRegDict[twn];
                regionFilter.val(reg);
            }
            doFilter($panel);
        });
        $panel.on("dblclick", ".option", function (event) {
            var $el = $(event.target);
            if ($el.is("select")) {
                $el.prop('selectedIndex', 0);
                $el.change();
            }
        });
        effButton.click(function () {
            var $btn = $(this);
            $btn.prop('disabled', true).css("color", "gray");
            // запросим чисто  фильтранутые ячейки и тупо найдем их число. взводим счетчики и финальную операцию
            var filterMask = filter(units, getFilterOptions($panel, mode), mode);
            filterMask.forEach(function (e, i, arr) { return e && inProcess.Count++; });
            inProcess.Finally = function () {
                // сотрем финальное действо выставим счетчик в инишиал вэлью. включим кнопку
                inProcess = { Count: 0, Finally: function () { } };
                $btn.prop('disabled', false).css("color", "red");
            };
            // заводим клики только для фильтранутых
            console.log(inProcess.Count + " units started.");
            units.forEach(function (e, i, arr) {
                if (filterMask[i]) {
                    e.$eff.addClass("auto"); // класс говорит что эффективность будет автозапрошена
                    e.$eff.trigger("click");
                }
            });
        });
        // дополняем панель до конца элементами
        //
        $panel.append("<span>Рег: </span>").append(regionFilter);
        $panel.append("<span> Гор: </span>").append(townFilter);
        $panel.append("<span> Тип: </span>").append(typeFilter);
        $panel.append("<span> Rx: </span>").append(textFilter);
        $panel.append("<span id='rows' style='color: blue;'></span>");
        $panel.append("<span> Тов: </span>").append(goodsFilter);
        if (mode === Modes.self) {
            $panel.append("<span> Алерт: </span>").append(problemsFilter);
            $panel.append("<span> Эф: </span>").append(efficiencyFilter);
            $panel.append("<span> </span>").append(effButton);
        }
        return $panel;
    }
    function efficiencyClick(units) {
        var realm = getRealm();
        for (var i = 0; i < units.length; i++)
            units[i].$eff.css("cursor", "pointer").prop("title", "Узнать прогноз эффективности");
        $unitList.on("click", "td.prod", function () {
            var $td = $(this);
            if ($td.hasClass("processing"))
                return false;
            var subid = numberfy($td.closest("tr").find("td.unit_id").text());
            if (subid < 0)
                throw new Error("subid not found for: " + $td);
            var url = "/" + realm + "/window/unit/productivity_info/" + subid;
            $td.empty().append($("<img>").attr({ src: "http://www.pixic.ru/i/50V1E3S444O3G076.gif", height: 16, width: 16 }).css('padding-right', '20px'));
            $td.addClass("processing");
            $.ajax({
                url: url,
                type: "GET",
                success: function (html, status, xhr) {
                    // если запрос в авторежиме
                    if ($td.hasClass("auto") && inProcess.Count <= 0)
                        throw new Error("somehow we got 0 in process counter");
                    // парсим страничку с данными эффективности
                    var $html = $(html);
                    var percent = $html.find('td:contains("Эффективность работы") + td td:eq(1)').text().replace('%', '').trim();
                    $td.html(percent + "<i>%</i>");
                    // выставляем значение в ячейку
                    var color = (percent == '100.00' ? 'green' : 'red');
                    $td.css('color', color);
                    $td.removeClass("processing");
                    // если запрос в авторежиме
                    if ($td.hasClass("auto")) {
                        $td.removeClass("auto");
                        inProcess.Count--;
                        if (inProcess.Count === 0)
                            inProcess.Finally();
                    }
                },
                error: function (xhr, status, error) {
                    //Resend ajax
                    var _this = this;
                    setTimeout(function () { return $.ajax(_this); }, 3000);
                }
            });
            return false;
        });
    }
}
function parseUnits($rows, mode) {
    var units = [];
    var parseImgs = function ($imgs) {
        var res = [];
        for (var m = 0; m < $imgs.length; m++)
            res.push({
                Name: $imgs.eq(m).attr("title").trim(),
                Url: $imgs.eq(m).attr("src")
            });
        return res;
    };
    var nameUrlToString = function (items) {
        var str = " ";
        for (var i = 0; i < items.length; i++)
            str += items[i].Name + " " + items[i].Url + " ";
        return str;
    };
    // через полный конвейр map 68 секунд
    // через нахождение ячеек из рядов и затем допарсинг так же
    // если сразу искать $(td.unit_id) и потом допарсивать в цикле то так же как по рядам.
    // просто по рядам 17 сек на 10к строк. приемлемо
    for (var i = 0; i < $rows.length; i++) {
        var $r = $rows.eq(i);
        var searchStr = "";
        var id = numberfy($r.find("td.unit_id").text()); // внутри триммится
        searchStr += id;
        var $geo = $r.find("td.geo");
        var reg = $geo.attr("title").trim();
        var twn = $geo.text().trim();
        searchStr += " " + reg + " " + twn;
        var $info = $r.find("td.info");
        var $link = $info.find("a");
        var name_1 = $link.text();
        var url = $link.attr("href");
        var type = $info.attr("title");
        var category = $info.attr("class").split("-")[1];
        searchStr += " " + name_1 + " " + url + " " + type + " " + category;
        //let goods = $r.find("td.spec").find("img").map(parseImg).get() as any as INameUrl[];
        var $goods = $r.find("td.spec").find("img");
        var goods = parseImgs($goods);
        searchStr += " " + nameUrlToString(goods);
        // на чужой странице нет проблем и эффективностей
        var problems = [];
        var $eff = $("<br/>");
        var eff = -1;
        if (mode === Modes.self) {
            var $problems = $r.find("td.alerts").find("img");
            problems = parseImgs($problems);
            searchStr += " " + nameUrlToString(problems);
            $eff = $r.find("td.prod");
            eff = numberfy($eff.clone().children().remove().end().text());
            searchStr += " " + eff;
        }
        units.push({
            $row: $r,
            Id: id,
            Region: reg,
            Town: twn,
            Name: name_1,
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
// возвращает массив равный числу юнитов. В ячейке true если юнита надо показывать. иначе false
function filter(units, options, mode) {
    var res = [];
    var textRx = new RegExp(options.TextRx, "i");
    for (var i = 0; i < units.length; i++) {
        var unit = units[i];
        res[i] = false;
        if (options.Region != "all" && unit.Region != options.Region)
            continue;
        if (options.Town != "all" && unit.Town != options.Town)
            continue;
        if (options.Type != "all" && unit.Type != options.Type)
            continue;
        if (textRx.test(unit.SearchString) === false)
            continue;
        if (options.GoodUrl != "all" && !unit.Goods.some(function (e) { return e.Url === options.GoodUrl; }))
            continue;
        if (mode === Modes.self) {
            if (options.ProblemUrl != "all" && !unit.Problems.some(function (e) { return e.Url === options.ProblemUrl; }))
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
        TextRx: $panel.find("#textFilter").val().toLowerCase(),
        GoodUrl: $panel.find("#goodsFilter").val(),
        ProblemUrl: mode === Modes.self ? $panel.find("#problemsFilter").val() : "",
        Efficiency: mode === Modes.self ? numberfy($panel.find("#efficiencyFilter").val()) : -1,
    };
}
function getGoods(units) {
    var goods = [];
    for (var i = 0; i < units.length; i++)
        goods.push.apply(goods, units[i].Goods);
    return makeKeyValCount(goods, function (el) { return el.Name; }, function (el) { return el.Url; });
}
function getProblems(units) {
    var problems = [];
    for (var i = 0; i < units.length; i++)
        problems.push.apply(problems, units[i].Problems);
    return makeKeyValCount(problems, function (el) { return el.Name; }, function (el) { return el.Url; });
}
function makeKeyValCount(items, keySelector, valueSelector) {
    var res = {};
    for (var i = 0; i < items.length; i++) {
        var key = keySelector(items[i]);
        var val = valueSelector ? valueSelector(items[i]) : key;
        if (res[key] != null)
            res[key].Count++;
        else
            res[key] = { Name: key, Value: val, Count: 1 };
    }
    var resArray = [];
    for (var key in res)
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
    var res = {};
    for (var i = 0; i < units.length; i++) {
        var town = units[i].Town;
        if (res[town] != null)
            if (res[town] !== units[i].Region)
                throw new Error("что то пошло не так. У одного города разные регионы у юнитов.");
        res[town] = units[i].Region;
    }
    return res;
}
$(document).ready(function () { return run(); });
//# sourceMappingURL=management.user.js.map