﻿
/// <reference path= "../../_jsHelper/jsHelper/jsHelper.ts" />

let Realm = getRealmOrError();

interface INameValueCount {
    Name: string;
    Value: string
    Count: number;
}
interface INameUrl {
    Name: string;
    Url: string;
}
interface IUnit {
    $row: JQuery;
    Id: number;
    Region: string;
    Town: string;
    Name: string;
    Tags: string[];
    Url: string;
    Type: string;
    Size: number;
    Goods: INameUrl[];
    Problems: INameUrl[];
    Efficiency: number;
    $eff: JQuery;
    SearchString: string;
}
interface IFilterOptions {
    Region: string;
    Town: string;
    Type: string;
    Size: number;
    Tag: string;
    TextRx: string;
    GoodUrl: string;
    ProblemUrl: string;
    Efficiency: number;
}
enum Modes { none, self, other }

function run() {
    let start = performance.now();
    let elapsed = 0;

    let $ = jQuery;
    let realm = getRealm();

    let mode = Modes.none;
    let $unitTop = $("#mainContent > table.unit-top")
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
    let townRegDict = makeRegTownDict(units);   // словарь чтобы удобно было найти связь город страна
    let inProcess = { Count: 0, Finally: () => { }};      // счетчик запущенных запросов по эффективности. когда закончится выполняет Finally 

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
    pager();    // вставлять именно после панели. иначе глюки

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
            
            let optHtml: string[] = [];
            for (let pages of [1000, 2000, 4000, 10000, 20000]) {
                let newOptHtml = $template[0].outerHTML.replace(new RegExp(number, "ig"), pages.toString());
                optHtml.push(newOptHtml);
            }

            $pager.append(optHtml.join(" "));
        }

        $unitList.before($pager.clone().add($("ul.pager_list").clone()));
    }

    // подсветка красным эффективности меньше 100
    function efficiencyColor(units: IUnit[]) {
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
    function doFilter($panel: JQuery) {

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
            } else {
                unit.$row.hide();
                if ($commentRow.length > 0)
                    $commentRow.hide();
            }
        }

        $panel.find("#rows").text(`[${cnt}]`);
    }

    function buildFilterPanel() {

        function buildOptions (items: INameValueCount[]) {
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
        let regions = makeKeyValCount<IUnit>(units, (el) => el.Region);
        regionFilter.append(buildOptions(regions));


        // фильтр по городам
        let townFilter = $("<select id='townFilter' class='option' style='max-width:120px;'>");
        let towns = makeKeyValCount<IUnit>(units, (el) => el.Town);
        townFilter.append(buildOptions(towns));

        // фильтр по типам
        let typeFilter = $("<select id='typeFilter' class='option' style='max-width:120px;'>");
        let types = makeKeyValCount<IUnit>(units, (el) => el.Type);
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
            .append('<option value=100>100%</option>')  // ТОЛЬКО 100%
            .append('<option value=10>< 100%</option>') // [0, 100%) - нерабочие НЕ выводить
            .append('<option value=0>0%</option>');

        // фильтр по размеру
        let sizeFilter = $("<select id='sizeFilter' class='option' style='max-width:120px;'>");
        let sizes = makeKeyValCount<IUnit>(units, el => el.Size.toString());
        sizeFilter.append(buildOptions(sizes));

        // фильтр по тегм
        let tagFilter = $("<select id='tagFilter' class='option' style='max-width:120px;'>");
        let taggedUnits = units.filter((val, i, arr) => val.Tags.length > 0);
        let tags = makeKeyValCountArr<IUnit>(taggedUnits, (el) => el.Tags);
        tagFilter.append(buildOptions(tags));

        // текстовый фильтр
        let textFilter = $("<input id='textFilter' class='option' style='width:50%;'></input>").attr({ type: 'text', value: '(?=.*)' });

        // запрос сразу всех данных по эффективности
        let effButton = $("<input type=button id=getEff value='GO'>").css("color", "red");


        // события смены фильтров
        //
        // делегируем все события на панель
        $panel.on("change", ".option", function(event: JQueryEventObject) {
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
        $panel.on("dblclick", ".option", function (event: JQueryEventObject) {
            let $el = $(event.target);
            if ($el.is("select")) {
                $el.prop('selectedIndex', 0);
                $el.change();
            }
        });

        effButton.click(async function (this: Element) {
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
                $rows= $rows.add(r);

            await updateEff_async($rows);
            $btn.prop('disabled', false).css("color", "red");
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

        $r2.append("<span> Разм: </span>").append(sizeFilter);
        $r2.append("<span> Тэг#: </span>").append(tagFilter);
        $r2.append("<span> Rx: </span>").append(textFilter);
        $r2.append("<span id='rows' style='color: blue;'></span>");

        return $panel;
    }

    function efficiencyClick(units: IUnit[]) {

        for (let i = 0; i < units.length; i++)
            units[i].$eff.css("cursor", "pointer").prop("title", "Узнать прогноз эффективности");

        $unitList.on("click", "td.prod", function (this: Element) {
            let $td = $(this);
            updateEff_async($td.closest("tr"));
        });
    }
}

async function updateEff_async($rows: JQuery) {

    let subids: number[] = [];

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
        let percent = await xforecast_async(subid);

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
}

/**
 * Запрашивает эффективность для заданного списка. Если много элементов то будет порционно выдавать результаты
   через коллбэк
 * @param subids
 * @param onPartDone
 */
async function getEff_async(subids: number[], onPartDone: IAction1<IDictionaryN<number>>) {
    if (subids == null)
        throw new Error(`subids == null`);

    console.log("запрашиваю для ", subids);

    let realm = getRealmOrError();
    const psize = 5;
    let i = 0;
    let part: number[] = [];
    do {
        // берем порцию. если вылезем за край массива то будет пустой срез
        part = subids.slice(i, i + psize);
        i += psize;

        // запрашиваем для нее данные
        let waitList: Promise<any>[] = [];
        for (let n = 0; n < part.length; n++) {
            let promise = tryGet_async(`/${realm}/window/unit/productivity_info/${part[n]}`);
            waitList.push(promise);
        }
        let htmlList = await Promise.all(waitList);

        // обработка и вытаскивание эффективности
        let res: IDictionaryN<number> = {};
        for (let n = 0; n < part.length; n++) {
            let percent = $(htmlList[n]).find('td:contains("Эффективность работы") + td td:eq(1)').text().replace('%', '').trim();
            res[part[n]] = numberfyOrError(percent, -1);
        }

        onPartDone(res);

    } while (part.length > 0);
}

/**
 * запрос прогноза для 1 юнита ajax
 * @param subid
 */
async function xforecast_async(subid: number): Promise<number> {

    let data = await tryPostJSON_async(`/${Realm}/ajax/unit/forecast`, { 'unit_id': subid });
    if (data['productivity'] == null)
        throw new Error("Не пришли данные по продуктивности для юнита " + subid);

    return Math.min(data['productivity'], 1) * 100;
}

function parseUnits($rows: JQuery, mode: Modes): IUnit[] {

    let units: IUnit[] = [];

    let parseImgs = ($imgs: JQuery): INameUrl[] => {
        let res: INameUrl[] = [];

        for (let m = 0; m < $imgs.length; m++)
            res.push({
                Name: $imgs.eq(m).attr("title").trim(),
                Url: $imgs.eq(m).attr("src")
            });

        return res;
    };
    let nameUrlToString = (items: INameUrl[]) => {
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

        let id = numberfy($r.find("td.unit_id").text());    // внутри триммится
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
        let problems: INameUrl[] = [];
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
        // спарсим теги, либо [] если его нет
        let tgs = parseTag(name);

        // размер предприятия
        let size = 0;
        if (mode == Modes.self)
            size = oneOrError($r, "td.size").find("div.graybox").length;
        else if (mode == Modes.other)
            size = oneOrError($r, "td.size").find("img").length;

        units.push({
            $row: $r,
            Id: id,
            Region: reg,
            Town: twn,
            Name: name,
            Tags: tgs,
            Url: url,
            Type: type,
            Size: size,
            Goods: goods,
            Problems: problems,
            Efficiency: eff,
            $eff: $eff,
            SearchString: searchStr
        });
    }

    return units;
}

/**
 * извлекает из строки все содержащиеся в ней теги. 
   Теги всегда в начале строки, всегда заканчиваются хештегом,
    тэги могут содержать цифробуквы без пробелов, но начинаются всегда с буквы. регистр не важен
    число тегов в строке не ограничено.
   Если тегов нет вернет пустой массив.
 * @param str Строка вида direct# goods# service# склад >> город
 */
function parseTag(str: string): string[] {

    let rx = /^(?:(?:[a-z,а-я]+\w*)#\s*)+/i;
    let items = rx.exec(str.toLowerCase());
    if (items == null)
        return [];

    let res: string[] = [];
    let tags = items[0].split("#");
    for (let i = 0; i < tags.length; i++) {
        let tag = tags[i].trim();
        if (tag.length > 0)
            res.push(tag);
    }
    return res;
}


// возвращает массив равный числу юнитов. В ячейке true если юнита надо показывать. иначе false
function filter(units: IUnit[], options: IFilterOptions, mode: Modes) {

    let res: boolean[] = [];
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

        if (options.Tag != "all" && isOneOf(options.Tag, unit.Tags) == false)
            continue;

        if (textRx.test(unit.SearchString) === false)
            continue;

        if (options.GoodUrl != "all" && !unit.Goods.some((e) => e.Url === options.GoodUrl))
            continue;

        if (options.Size != -1 && unit.Size != options.Size)
            continue;

        if (mode === Modes.self) {

            if (options.ProblemUrl != "all" && !unit.Problems.some((e) => e.Url === options.ProblemUrl))
                continue;

            switch (options.Efficiency) {
                case 100: // 100
                    if (unit.Efficiency < 100) continue;
                    break;

                case 10: // < 100: [0, 100)  если юнит неактивен или в отпуске то будет -1
                    if (unit.Efficiency >= 100 || unit.Efficiency < 0) continue;
                    break;

                case 0: // 0
                    if (unit.Efficiency > 0) continue;
                    break;

                case -1: // all
                    break;
            }
        }

        res[i] = true;
    }

    return res;
}

function getFilterOptions($panel: JQuery, mode: Modes): IFilterOptions {
    return {
        Region: $panel.find("#regionFilter").val(),
        Town: $panel.find("#townFilter").val(),
        Type: $panel.find("#typeFilter").val(),
        Tag: $panel.find("#tagFilter").val(),
        Size: numberfy($panel.find("#sizeFilter").val()),
        TextRx: $panel.find("#textFilter").val().toLowerCase(),
        GoodUrl: $panel.find("#goodsFilter").val(),
        ProblemUrl: mode === Modes.self ? $panel.find("#problemsFilter").val() : "",
        Efficiency: mode === Modes.self ? numberfy($panel.find("#efficiencyFilter").val()) : -1,
    }
}

function getGoods(units: IUnit[]) {

    let goods: INameUrl[] = [];
    for (let i = 0; i < units.length; i++)
        goods.push.apply(goods, units[i].Goods);

    return makeKeyValCount(goods, (el) => el.Name, (el) => el.Url);
}

function getProblems(units: IUnit[]) {

    let problems: INameUrl[] = [];
    for (let i = 0; i < units.length; i++)
        problems.push.apply(problems, units[i].Problems);

    return makeKeyValCount(problems, (el) => el.Name, (el) => el.Url);
}


function makeKeyValCount<T>(items: T[], keySelector: (el: T) => string, valueSelector?: (el: T) => string) {

    let res: IDictionary<INameValueCount> = {};
    for (let i = 0; i < items.length; i++) {
        let key = keySelector(items[i]);
        let val = valueSelector ? valueSelector(items[i]) : key;

        if (res[key] != null)
            res[key].Count++;
        else
            res[key] = { Name: key, Value: val, Count: 1 };
    }

    let resArray: INameValueCount[] = [];
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

function makeKeyValCountArr<T>(items: T[], keySelector: (el: T) => string[]) {

    let res: IDictionary<INameValueCount> = {};
    for (let i = 0; i < items.length; i++) {
        let keys = keySelector(items[i]);
        for (let key of keys) {
            let val = key;
            if (res[key] != null)
                res[key].Count++;
            else
                res[key] = { Name: key, Value: val, Count: 1 };
        }
    }

    let resArray: INameValueCount[] = [];
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

function makeRegTownDict(units: IUnit[]): IDictionary<string> {

    let res: IDictionary<string> = {};
    for (let i = 0; i < units.length; i++) {
        let town = units[i].Town;
        if (res[town] != null)
            if (res[town] !== units[i].Region)
                throw new Error("что то пошло не так. У одного города разные регионы у юнитов.");

        res[town] = units[i].Region
    }

    return res;
}


$(document).ready(() => run());
