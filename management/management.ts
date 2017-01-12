// ==UserScript==
// @name           Virtonomica: management
// @namespace      https://github.com/ra81/management
// @version 	   1.64
// @description    Добавление нового функционала к управлению предприятиями
// @include        https://*virtonomic*.*/*/main/company/view/*/unit_list
// @include        https://*virtonomic*.*/*/main/company/view/*
// ==/UserScript==

//debugger;а

type TNameValueCount = { Name: string, Value:string, Count: number };
type TNameUrl = { Name: string, Url: string };
type TUnit = {
    $row: JQuery,
    Id: number,
    Region: string,
    Town: string,
    Goods: TNameUrl[],
    Problems: TNameUrl[],
    Efficiency: number,
    $eff: JQuery
};

interface IDictionary<T> {
    [key: string]: T;
}

function run() {
    let $ = jQuery;
    let realm = getRealm();

    let $unitTop = $("#mainContent > table.unit-top")
    let $unitList = $("#mainContent > table.unit-list-2014");
    let $rows = $unitList.find("td.unit_id").closest("tr");

    let units = parseUnits();
    let townRegDict = makeRegTownDict(units);

    // поиск эффективности и подсветка красным всего что не 100%
    efficiencyColor(units);

    // клик на эффективность
    efficiencyClick(units);

    // сокращенный размер для размеров подразделений
    resizeSizeColumn();

    // Перемещаем создать подразделение в одну строку с типа подразделений
    moveCreateBtn();

    // удаляем в строке с названиями, вторую строку о числе работников, и размере складов и так далее.
    //unitList.find("td.info").each(function () { $(this).children().not("a").remove(); });

    // создаем панельку, и шоутайм.
    buildFilterPanel(units);
    



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
    function efficiencyColor(units: TUnit[]) {
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
        // скроем большую кнопку
        var btn = $unitTop.find("a.btn-success");
        btn.hide();

        // забираем картинку с кнопки и создаем новую миникнопку
        var btnImg = btn.find("img.img_button");
        var newBtn = "<a href=" + btn.attr('href') + " title='Создать подразделение'><img src=" + btnImg.attr('src') + "></a>";

        // вставляем кнопку на панель. Но бывает что панели нет, просто перенесем кнопку
        let typeToolbar = $unitTop.find("td.u-l");
        if (typeToolbar.length >= 0)
            typeToolbar.append(newBtn);
        else {
            //$unitTop.find("tr").first().append(btn);
            btn.show();
        }
    }

    // делает фильтрацию
    function doFilter($panel: JQuery) {
        //searchPanel = $("#filterPanel");
        //console.log("1");
        //console.log(searchPanel);
        //console.log(unitTable);
        let region = $panel.find("#regionFilter").val();
        let town = $panel.find("#townFilter").val();
        let text = $panel.find("#textFilter").val().toLowerCase();
        let efficiency = $panel.find("#efficiencyFilter").val();
        let goodUrl = $panel.find("#goodsFilter").val();
        let problemUrl = $panel.find("#problemsFilter").val();

        for (let i = 0; i < units.length; i++) {
            let unit = units[i];

            // фильтрация
            var show = true;

            if (region != "all" && unit.Region != region)
                show = false;

            if (town != "all" && unit.Town != town)
                show = false;


            if (unit.$row.text().match(new RegExp(text, "i")) == null)
                show = false;

            if (goodUrl != "all" && !unit.Goods.some((e) => e.Url === goodUrl))
                show = false;

            if (problemUrl != "all" && !unit.Problems.some((e) => e.Url === problemUrl))
                show = false;

            switch (efficiency) {
                case '10':
                    {
                        if (unit.Efficiency == 0 || unit.Efficiency == 100)
                            show = false;
                        break;
                    }
                case '100': {
                    if (unit.Efficiency < 100)
                        show = false;
                    break;
                }
                case '0': {
                    if (unit.Efficiency > 0)
                        show = false;
                    break;
                }
                case '-1':
                    break;
            }

            //console.log(row);
            //console.log(name);
            //console.log(show);
            var $commentRow = unit.$row.next("tr.unit_comment");

            if (show) {
                unit.$row.show();
                if ($commentRow.length > 0)
                    $commentRow.show();
            } else {
                unit.$row.hide();
                if ($commentRow.length > 0)
                    $commentRow.hide();
            }
        }
    }

    function buildFilterPanel(units: TUnit[]) {

        function buildOptions (items: TNameValueCount[]) {
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
        let panelHtml = "<div id='filterPanel' style='padding: 2px; border: 1px solid #0184D0; border-radius: 4px 4px 4px 4px; float:left; white-space:nowrap; color:#0184D0; display:none;'></div>";
        let panel = $(panelHtml);

        // фильтр по регионам
        let regionFilter = $("<select id='regionFilter' style='max-width:100px;'>");
        let regions = makeKeyValCount<TUnit>(units, (el) => el.Region);
        regionFilter.append(buildOptions(regions));


        // фильтр по городам
        let townFilter = $("<select id='townFilter' style='max-width:100px;'>");
        let towns = makeKeyValCount<TUnit>(units, (el) => el.Town);
        townFilter.append(buildOptions(towns));


        // фильтр по товарам
        let goodsFilter = $("<select id='goodsFilter' style='max-width:100px;'>");
        goodsFilter.append(buildOptions(getGoods(units)));


        // фильтр по проблемам
        let problemsFilter = $("<select id='problemsFilter' style='max-width:100px;'>");
        problemsFilter.append(buildOptions(getProblems(units)));


        // фильтр по эффективности
        let efficiencyFilter = $("<select id='efficiencyFilter' style='max-width:50px;'>")
            .append('<option value=-1>Все</option>')
            .append('<option value=10>< 100%</option>')
            .append('<option value=100>100%</option>')
            .append('<option value=0>0%</option>');


        // текстовый фильтр
        let textFilter = $('<input id="textFilter" style="max- width:100px;"></input>').attr({ type: 'text', value: '' });


        // события смены фильтров
        //
        // смена региона сбрасывает выбор города в all
        regionFilter.change(function () {
            townFilter.val("all");
            doFilter(panel);
        });

        // на смене города выставим регион в тот, который соответствует городу.
        townFilter.change(function (this: HTMLSelectElement) {
            let select = $(this);
            let twn = select.val();
            let reg = twn === "all" ? "all" : townRegDict[twn];

            //console.log(reg);
            regionFilter.val(reg);
            doFilter(panel);
        });

        // просто фильтруем.
        textFilter.change(function () {
            //var text = this.value;
            //console.log(text);

            doFilter(panel);
        });

        efficiencyFilter.change(function () {
            //var text = this.value;
            //console.log(text);

            doFilter(panel);
        });

        goodsFilter.change(function () {
            //var text = this.value;
            //console.log(text);

            doFilter(panel);
        });

        problemsFilter.change(function () {
            //var text = this.value;
            //console.log(text);

            doFilter(panel);
        });

        // дополняем панель до конца элементами
        //
        panel.append("<span>Регион: </span>").append(regionFilter);
        panel.append("<span> Город: </span>").append(townFilter);
        panel.append("<span> Текст: </span>").append(textFilter);
        panel.append("<span> Товары: </span>").append(goodsFilter);
        panel.append("<span> Проблемы: </span>").append(problemsFilter);
        panel.append("<span> Эфф: </span>").append(efficiencyFilter);

        $unitTop.append("<tr><td id='filter' colspan=3></td></tr>").find("#filter").append(panel);
        panel.show();
    }

    // клик на эффективность
    function efficiencyClick(units: TUnit[]) {

        let realm = getRealm();

        for (let i = 0; i < units.length; i++)
            units[i].$eff.css("cursor", "pointer").prop("title", "Узнать прогноз эффективности");

        $unitList.on("click", "td.prod", function (this: Element) {
            let $td = $(this);

            if ($td.hasClass("processing"))
                return false;

            let subid = numberfy($td.closest("tr").find("td.unit_id").text());
            if (subid < 0)
                throw new Error("subid not found for: " + $td);

            let url = `/${realm}/window/unit/productivity_info/${subid}`;

            $td.empty().append($("<img>").attr({ src: "http://www.pixic.ru/i/50V1E3S444O3G076.gif", height: 16, width: 16 }).css('padding-right', '20px'));
            $td.addClass("processing");
            $.ajax({
                url: url,
                type: "GET",

                success: function (html, status, xhr) {
                    // парсим страничку с данными эффективности
                    let $html = $(html);
                    let percent = $html.find('td:contains("Эффективность работы") + td td:eq(1)').text().replace('%', '').trim();
                    $td.html(percent + "<i>%</i>");

                    // выставляем значение в ячейку
                    let color = (percent == '100.00' ? 'green' : 'red');
                    $td.css('color', color);
                    $td.removeClass("processing");
                },
                error: function (this: any, xhr: any, status: any, error: any) {
                    //Resend ajax
                    var _this = this;
                    setTimeout(() => $.ajax(_this), 3000);
                }
            });	

            return false;
        });
    }

    function getGoods(units: TUnit[]) {

        let goods: TNameUrl[] = [];
        for (let i = 0; i < units.length; i++)
            goods.push.apply(goods, units[i].Goods);

        return makeKeyValCount(goods, (el) => el.Name, (el) => el.Url);
    }

    function getProblems(units: TUnit[]) {

        let problems: TNameUrl[] = [];
        for (let i = 0; i < units.length; i++)
            problems.push.apply(problems, units[i].Problems);

        return makeKeyValCount(problems, (el) => el.Name, (el) => el.Url);
    }

    function parseUnits(): TUnit[] {

        let units: TUnit[] = [];
        for (let i = 0; i < $rows.length; i++) {
            let $r = $rows.eq(i);

            let id = numberfy($r.find("td.unit_id").text());

            let $geo = $r.find("td.geo");
            let reg = $geo.attr("title").trim();
            let twn = $geo.text().trim();

            let goods = $r.find("td.spec").find("img").map((i, e): TNameUrl => {
                return { Name: $(e).attr("title"), Url: $(e).attr("src") };
            }).get() as any as TNameUrl[];

            let problems = $r.find("td.alerts").find("img").map((i, e): TNameUrl => {
                return { Name: $(e).attr("title"), Url: $(e).attr("src") };
            }).get() as any as TNameUrl[];

            let $eff = $r.find("td.prod");
            let eff = numberfy($eff.clone().children().remove().end().text());

            units.push({
                $row: $r,
                Id: id,
                Region: reg,
                Town: twn,
                Goods: goods,
                Problems: problems,
                Efficiency: eff,
                $eff: $eff
            });
        }

        return units;
    }
}

function getRealm(): string | null {
    // https://*virtonomic*.*/*/main/globalreport/marketing/by_trade_at_cities/*
    // https://*virtonomic*.*/*/window/globalreport/marketing/by_trade_at_cities/*
    let rx = new RegExp(/https:\/\/virtonomic[A-Za-z]+\.[a-zA-Z]+\/([a-zA-Z]+)\/.+/ig);
    let m = rx.exec(document.location.href);
    if (m == null)
        return null;

    return m[1];
}

function makeKeyValCount<T>(items: T[], keySelector: (el: T) => string, valueSelector?: (el: T) => string) {

    let res: IDictionary<TNameValueCount> = {};
    for (let i = 0; i < items.length; i++) {
        let key = keySelector(items[i]);
        let val = valueSelector ? valueSelector(items[i]) : key;

        if (res[key] != null)
            res[key].Count++;
        else
            res[key] = { Name: key, Value: val, Count: 1 };
    }

    let resArray: TNameValueCount[] = [];
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

function makeRegTownDict(units: TUnit[]): IDictionary<string> {

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

function numberfy(str: string): number {
    // возвращает либо число полученно из строки, либо БЕСКОНЕЧНОСТЬ, либо -1 если не получилось преобразовать.

    if (String(str) === 'Не огр.' ||
        String(str) === 'Unlim.' ||
        String(str) === 'Не обм.' ||
        String(str) === 'N’est pas limité' ||
        String(str) === 'No limitado' ||
        String(str) === '无限' ||
        String(str) === 'Nicht beschr.') {
        return Number.POSITIVE_INFINITY;
    } else {
        return parseFloat(str.replace(/[\s\$\%\©]/g, "")) || -1;
        //return parseFloat(String(variable).replace(/[\s\$\%\©]/g, "")) || 0; //- так сделано чтобы variable когда undef получалась строка "0"
    }
}

$(document).ready(() => run());
