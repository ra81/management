// ==UserScript==
// @name           Virtonomica: management
// @namespace      https://github.com/ra81/management
// @version 	   1.64
// @description    Добавление нового функционала к управлению предприятиями
// @include        https://*virtonomic*.*/*/main/company/view/*/unit_list
// @include        https://*virtonomic*.*/*/main/company/view/*
// ==/UserScript==
function run() {
    var $ = jQuery;
    var realm = getRealm();
    var $unitTop = $("#mainContent > table.unit-top");
    var $unitList = $("#mainContent > table.unit-list-2014");
    var $rows = $unitList.find("td.unit_id").closest("tr");
    var units = parseUnits();
    var townRegDict = makeRegTownDict(units);
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
        // скроем большую кнопку
        var btn = $unitTop.find("a.btn-success");
        btn.hide();
        // забираем картинку с кнопки и создаем новую миникнопку
        var btnImg = btn.find("img.img_button");
        var newBtn = "<a href=" + btn.attr('href') + " title='Создать подразделение'><img src=" + btnImg.attr('src') + "></a>";
        // вставляем кнопку на панель. Но бывает что панели нет, просто перенесем кнопку
        var typeToolbar = $unitTop.find("td.u-l");
        if (typeToolbar.length >= 0)
            typeToolbar.append(newBtn);
        else {
            //$unitTop.find("tr").first().append(btn);
            btn.show();
        }
    }
    // делает фильтрацию
    function doFilter($panel) {
        //searchPanel = $("#filterPanel");
        //console.log("1");
        //console.log(searchPanel);
        //console.log(unitTable);
        var region = $panel.find("#regionFilter").val();
        var town = $panel.find("#townFilter").val();
        var text = $panel.find("#textFilter").val().toLowerCase();
        var efficiency = $panel.find("#efficiencyFilter").val();
        var goodUrl = $panel.find("#goodsFilter").val();
        var problemUrl = $panel.find("#problemsFilter").val();
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            // фильтрация
            var show = true;
            if (region != "all" && unit.Region != region)
                show = false;
            if (town != "all" && unit.Town != town)
                show = false;
            if (unit.$row.text().match(new RegExp(text, "i")) == null)
                show = false;
            if (goodUrl != "all" && !unit.Goods.some(function (e) { return e.Url === goodUrl; }))
                show = false;
            if (problemUrl != "all" && !unit.Problems.some(function (e) { return e.Url === problemUrl; }))
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
            }
            else {
                unit.$row.hide();
                if ($commentRow.length > 0)
                    $commentRow.hide();
            }
        }
    }
    function buildFilterPanel(units) {
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
        var panel = $(panelHtml);
        // фильтр по регионам
        var regionFilter = $("<select id='regionFilter' style='max-width:100px;'>");
        var regions = makeKeyValCount(units, function (el) { return el.Region; });
        regionFilter.append(buildOptions(regions));
        // фильтр по городам
        var townFilter = $("<select id='townFilter' style='max-width:100px;'>");
        var towns = makeKeyValCount(units, function (el) { return el.Town; });
        townFilter.append(buildOptions(towns));
        // фильтр по товарам
        var goodsFilter = $("<select id='goodsFilter' style='max-width:100px;'>");
        goodsFilter.append(buildOptions(getGoods(units)));
        // фильтр по проблемам
        var problemsFilter = $("<select id='problemsFilter' style='max-width:100px;'>");
        problemsFilter.append(buildOptions(getProblems(units)));
        // фильтр по эффективности
        var efficiencyFilter = $("<select id='efficiencyFilter' style='max-width:50px;'>")
            .append('<option value=-1>Все</option>')
            .append('<option value=10>< 100%</option>')
            .append('<option value=100>100%</option>')
            .append('<option value=0>0%</option>');
        // текстовый фильтр
        var textFilter = $('<input id="textFilter" style="max- width:100px;"></input>').attr({ type: 'text', value: '' });
        // события смены фильтров
        //
        // смена региона сбрасывает выбор города в all
        regionFilter.change(function () {
            townFilter.val("all");
            doFilter(panel);
        });
        // на смене города выставим регион в тот, который соответствует городу.
        townFilter.change(function () {
            var select = $(this);
            var twn = select.val();
            var reg = twn === "all" ? "all" : townRegDict[twn];
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
                    // парсим страничку с данными эффективности
                    var $html = $(html);
                    var percent = $html.find('td:contains("Эффективность работы") + td td:eq(1)').text().replace('%', '').trim();
                    $td.html(percent + "<i>%</i>");
                    // выставляем значение в ячейку
                    var color = (percent == '100.00' ? 'green' : 'red');
                    $td.css('color', color);
                    $td.removeClass("processing");
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
    function parseUnits() {
        var units = [];
        for (var i = 0; i < $rows.length; i++) {
            var $r = $rows.eq(i);
            var id = numberfy($r.find("td.unit_id").text());
            var $geo = $r.find("td.geo");
            var reg = $geo.attr("title").trim();
            var twn = $geo.text().trim();
            var goods = $r.find("td.spec").find("img").map(function (i, e) {
                return { Name: $(e).attr("title"), Url: $(e).attr("src") };
            }).get();
            var problems = $r.find("td.alerts").find("img").map(function (i, e) {
                return { Name: $(e).attr("title"), Url: $(e).attr("src") };
            }).get();
            var $eff = $r.find("td.prod");
            var eff = numberfy($eff.clone().children().remove().end().text());
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
function getRealm() {
    // https://*virtonomic*.*/*/main/globalreport/marketing/by_trade_at_cities/*
    // https://*virtonomic*.*/*/window/globalreport/marketing/by_trade_at_cities/*
    var rx = new RegExp(/https:\/\/virtonomic[A-Za-z]+\.[a-zA-Z]+\/([a-zA-Z]+)\/.+/ig);
    var m = rx.exec(document.location.href);
    if (m == null)
        return null;
    return m[1];
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
        return parseFloat(str.replace(/[\s\$\%\©]/g, "")) || -1;
    }
}
$(document).ready(function () { return run(); });
//# sourceMappingURL=management.user.js.map