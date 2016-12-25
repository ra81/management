// ==UserScript==
// @name           Virtonomica: управление предприятиями
// @namespace      virtonomica
// @version 	   1.60
// @description    Добавление нового функционала к управлению предприятиями
// @include        https://*virtonomic*.*/*/main/company/view/*/unit_list
// @include        https://*virtonomic*.*/*/main/company/view/*
// ==/UserScript==

//debugger;а

var run = function ()
{
    var win = (typeof (unsafeWindow) != 'undefined' ? unsafeWindow : top.window);
    $ = win.$;  // походу дергаем jquery из окна типо он уже должен быть

    // текущая ссылка
    var url = /^https:\/\/virtonomic[as]\.(\w+)\/\w+\//.exec(location.href)[0];

    var unitTop = $("#mainContent > table.unit-top");
    var unitList = $("#mainContent > table.unit-list-2014");

    // поиск эффективности и подсветка красным всего что не 100%
    efficiencyColor(unitList);

    // клик на эффективность
    efficiencyClick(unitList);

    // сокращенный размер для размеров подразделений
    resizeSizeColumn(unitList);

    // Перемещаем создать подразделение в одну строку с типа подразделений
    moveCreateBtn(unitTop);


    // создаем панельку, и шоутайм.
    var pane = getFilterPanel(unitTop, unitList);
    pane.show();



    // Функции
    //
    // формирует стиль для столбца с размером подразделения чтобы он меньше занимал места
    function getStyle()
    {
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

    // ненужная функция
    function getSizeHtml(size)
    {
        var out = "<div>";
        for (var i = 0; i < size; i++) {
            out += "<div class=tchk >&nbsp;</div>";
            if (i == 2)
                out += "<div style='clear:both'></div>";
        }

        out += "</div>";
        return out;
    }

    // подсветка красным эффективности меньше 100
    function efficiencyColor(unitTable)
    {
        unitTable.find("td.prod").each(function ()
        {
            var ef = parseInt($(this).text());
            if (ef < 100)
                $(this).css("color", 'red');
        });
    }

    // сокращенный размер для размеров подразделений
    function resizeSizeColumn(unitTable)
    {
        var sizeColumnHeader = unitTable.find("div.field_title")[3];
        //console.log(sizeColumnHeader);
        var newHeader = $(sizeColumnHeader).html().replace("Размер", "Р.");
        $(sizeColumnHeader).html(newHeader);
        sizeColumnHeader.title = "размер подраздления (от 1 до 6)";
    }

    // перемещает кнопку создания нового юнита чтобы она занимала меньше места
    function moveCreateBtn(unitTop)
    {
        // скроем большую кнопку
        var btn = $(unitTop).find("a.btn-success");
        btn.hide();

        // забираем картинку с кнопки и создаем новую миникнопку
        var btnImg = btn.find("img.img_button");
        var newBtn = "<a href=" + btn.attr('href') + " title='Создать подразделение'><img src=" + btnImg.attr('src') + "></a>";

        // вставляем кнопку на панель
        var typeToolbar = $(unitTop).find("td.u-l");
        typeToolbar.append(newBtn);
    }

    // клик на эффективность
    function efficiencyClick(unitTable)
    {
        var eff = unitTable.find("td.prod");
        eff.css("cursor", "pointer");
        eff.prop("title", "Узнать прогноз эффективности");
        eff.click(function ()
        {
            var td = $(this);
            var row = $(this).parent();
            var unitId = row.find("td.unit_id").text();
            var newEffUrl = url + 'window/unit/productivity_info/' + unitId;

            td.empty().append($("<img>").attr({ "src": "http://www.pixic.ru/i/50V1E3S444O3G076.gif", "height": 16, "width": 16 }).css('padding-right', '20px'));
            $.get(newEffUrl, function (data)
            {
                var percent = $('td:contains(Эффективность работы) + td td:eq(1)', data).text().replace('%', '').trim();
                td.html(percent + "<i>%</i>");

                var color = (percent == '100.00' ? 'green' : 'red');
                td.css('color', color);
            });

            //console.log(unitId);
        });

    }

    // делает фильтрацию
    function DoFilter(unitTable, searchPanel) {
        //searchPanel = $("#filterPanel");
        //console.log("1");
        //console.log(searchPanel);
        //console.log(unitTable);
        var region = searchPanel.find("#regionFilter").val();
        var town = searchPanel.find("#townFilter").val();
        var text = searchPanel.find("#textFilter").val().toLowerCase();
        var efficiency = searchPanel.find("#efficiencyFilter").val();

        //console.log("2");
        //console.log(region);
        //console.log(town);
        //console.log(text);
        //console.log(efficiency);

        unitTable.find("td.unit_id").parent().each(function() {
            var row = $(this);
            //console.log(row)

            // регион и город
            var geoTd = row.children("td.geo")[0];
            //console.log(geoTd);
            var reg = geoTd.title;
            var twn = geoTd.textContent.trim();

            // текущая эффективность
            var eff = parseFloat(row.children("td.prod").text());

            // название юнита
            var name = row.children("td.info").children("a").text().toLowerCase();
            //console.log(reg);
            //console.log(twn);
            //console.log(eff);
            //console.log(name);

            // фильтрация
            var show = true;

            if (region != "all" && reg != region)
                show = false;

            if (town != "all" && twn != town)
                show = false;

            if (name.match(text) == null)
                show = false;

            switch (efficiency) {
                case '10':
                {
                    if (eff == 0 || eff == 100)
                        show = false;
                    break;
                }
                case '100': {
                    if (eff < 100)
                        show = false;
                    break;
                }
                case '0': {
                    if (eff > 0)
                        show = false;
                    break;
                }
                case '-1':
                    break;
            }

            //console.log(row);
            //console.log(name);
            //console.log(show);
            var commentRow = row.next("tr.unit_comment");

            if (show) {
                row.show();
                if (commentRow.length > 0)
                    commentRow.show();

            } else {
                row.hide();
                if (commentRow.length > 0)
                    commentRow.hide();
            }
            //str.toLowerCase().indexOf("yes") >= 0
        });
        
    }

    function getFilterPanel(unitTop, unitTable) {
        var container = $(unitTop).find("tbody");

        // если панели еще нет, то добавить её
        var panel = $(unitTop).find("#filterPanel");
        if (panel.length == 0) {
            var panelHtml = "<div id='filterPanel' style='padding: 2px; border: 1px solid #0184D0; border-radius: 4px 4px 4px 4px; float:left; white-space:nowrap; color:#0184D0; display:none;'></div>";
            container.append("<tr><td>" + panelHtml + "</td></tr>");
            panel = $(unitTop).find("#filterPanel");
        }

        // фильтр по регионам
        //
        var regionList = getRegions(unitTable);
        var regionFilter = $(" <select id='regionFilter' style='max-width:140px;'>");
        regionFilter.append('<option value="all", label="all">&nbsp;</option>');
        regionList.forEach(function(item, i, arr) {
            var html = '<option value="' + item.Region + '">' + item.Region;
            if (item.UnitCount > 1)
                html += ' (' + item.UnitCount + ')';

            html += '</option>';
            regionFilter.append(html);
        });

        // фильтр по городам
        //
        var townList = getTowns(unitTable);
        var townFilter = $("<select id='townFilter' style='max-width:140px;'>");
        townFilter.append('<option value="all", label="all">&nbsp;</option>');
        townList.forEach(function (item, i, arr) {
            var lbl = item.UnitCount > 1 ? `label="${item.Town} (${item.UnitCount})"` : `label="${item.Town}"`;

            var val = `value="${item.Town}"`;
            var txt = item.Region;

            var html = `<option ${lbl} ${val}>${txt}</option>`;
            townFilter.append(html);
        });

        // фильтр по эффективности
        // 
        var efficiencyFilter = $("<select id='efficiencyFilter' style='max-width:140px;'>")
            .append('<option value=-1>Все</option>')
            .append('<option value=10>< 100%</option>')
            .append('<option value=100>100%</option>')
            .append('<option value=0>0%</option>');

        // текстовый фильтр
        //
        var textFilter = $('<input id="textFilter"></input>').attr({ type: 'text', value: '' });


        // события смены фильтров
        //
        // смена региона сбрасывает выбор города в all
        regionFilter.change(function ()
        {
            var select = $(this);
            townFilter.val("all");
            DoFilter(unitTable, panel);
        });

        // на смене города выставим регион в тот, который соответствует городу.
        townFilter.change(function () {
            var select = $(this);
            var reg = select.children().eq(select[0].selectedIndex).get(0).text;
            //console.log(reg);
            regionFilter.val(reg);

            DoFilter(unitTable, panel);
        });

        // просто фильтруем.
        textFilter.change(function() {
            //var text = this.value;
            //console.log(text);

            DoFilter(unitTable, panel);
        });

        efficiencyFilter.change(function ()
        {
            //var text = this.value;
            //console.log(text);

            DoFilter(unitTable, panel);
        });


        // дополняем панель до конца элементами
        //
        panel.append("<span>Регион: </span>").append(regionFilter);
        panel.append("<span> Город: </span>").append(townFilter);
        panel.append("<span> Текст: </span>").append(textFilter);
        panel.append("<span> Эффективность: </span>").append(efficiencyFilter);

        return panel;
    }

    // вернет регионы сортированные с числом юнитов в каждом {Region: "", UnitCount: 1}
    function getRegions(unitTable)
    {
        // тащим все ячейки с названиями городов. так же и регион в ней в титле
        var items = $(unitTable).find("td.geo");

        var regions = {};
        //var options = {};

        // идем по всем строкам юнитов, считаем число юнитов по каждому региону для вывода
        for (i = 0; i < items.length; i++) {
            var reg = items.eq(i).attr("title");
            
            if (regions[reg] != null)
                regions[reg].UnitCount++;
            else
                regions[reg] = { Region: reg, UnitCount: 1 };

            //options[reg] = items.eq(i).attr('class').replace('geo', 'geocombo');
        }

        var regArray = [];
        Object.values(regions).forEach(function(item, i, arr) {
                regArray.push(item);
            });
        
        regArray.sort(function (a, b)
        {
            if (a.Region > b.Region)
                return 1;

            if (a.Region < b.Region)
                return -1;

            return 0;
        });
        
        return regArray;
    }

    function getTowns(unitTable)
    {
        // тащим все ячейки с названиями городов. так же и регион в ней в титле
        var items = $(unitTable).find("td.geo");

        var towns = {};
        //var options = {};

        // идем по всем строкам юнитов, считаем число юнитов по каждому региону для вывода
        for (i = 0; i < items.length; i++) {
            var t = items.eq(i).html().trim();
            var reg = items.eq(i).attr("title").trim();

            if (towns[t] != null)
                towns[t].UnitCount++;
            else
                towns[t] = { Region: reg, Town: t, UnitCount: 1 };

            //options[reg] = items.eq(i).attr('class').replace('geo', 'geocombo');
        }

        var regArray = [];
        Object.values(towns).forEach(function(item, i, arr) {
                regArray.push(item);
            });

        regArray.sort(function (a, b)
        {
            if (a.Town > b.Town)
                return 1;

            if (a.Town < b.Town)
                return -1;

            return 0;
        });

        return regArray;
    }
};


// добавить скрипт на страницу
if (window.top == window)
{
    var script = document.createElement("script");
    script.textContent = '(' + run.toString() + ')();';
    document.documentElement.appendChild(script);
}