'use strict';

var jq = $.noConflict()

console.log(jq)

window.onload = function() {
    console.log("window onload")
};

// $(document).ready()
jq(function () {
    console.log("document ready");



    init_tab_scripts();

    init_tab_processes();

});

function init_tab_scripts() {
    var item_script_template = jq(`
<tr>
    <td id="script-name"></td>
    <td>
        <button id="btn-edit" type="button" class="btn btn-default">查看</button>
        <button id="btn-exec" type="button" class="btn btn-default">执行</button>
        <button id="btn-rm" type="button" class="btn btn-default">删除</button>
    </td>
</tr>
    `);

    var createScriptItem = function (name) {
        let item = {
            item: item_script_template.clone(),
        };
        item.btn_edit = item.item.find('#btn-edit');
        item.btn_exec = item.item.find('#btn-exec');
        item.btn_rm = item.item.find('#btn-rm');
        item.script_name = item.item.find('#script-name');
        item.getName = function () {
            return item.script_name.html();
        };
        item.setName = function (name) {
            item.script_name.html(name);
        };

        item.setName(name);

        item.btn_edit.on("click", function () {
            console.log(`${name} edit click`);
            modal_script_edit.openEdit(name);
        });

        item.btn_exec.on("click", function () {
            console.log(`${name} exec click`);
            modal_script_exec.exec(name);
        });

        item.btn_rm.on("click", function () {
            console.log(`${name} rm click`);
            modal_script_rm.open(name);
        });

        return item;
    };

    var tab_scripts = jq("#shell-scripts");

    var scriptMap = new Map();

    var table_scripts_body = tab_scripts.find("#table-scripts-body");

    var addScriptItem = function (name, item) {
        if (scriptMap.get(name)) {
            console.log('script item', name, 'exsit');
            return
        }
        scriptMap.set(name, item);
        table_scripts_body.append(item.item);
    };

    var rmScriptItem = function (name) {
        let item = scriptMap.get(name);
        if (!item) {
            console.log('script item', name, 'not exsit');
            return;
        }
        scriptMap.delete(name);
        item.item.remove();
    };

    var $modal_script_exec = tab_scripts.find('#modal-script-exec');
    var modal_script_exec = {
        modal: $modal_script_exec,
        btn_close: $modal_script_exec.find('#btn-close'),
        script_name: $modal_script_exec.find('#script-name'),
        label_tips: $modal_script_exec.find('#label-tips'),
        output: $modal_script_exec.find('#output'),
    };
    {
        modal_script_exec.modal.modal({backdrop: false, show: false});

        modal_script_exec.modal.on('show.bs.modal', function(){
            var $this = jq(this);
            var $modal_dialog = $this.find('.modal-dialog');
            // 关键代码，如没将modal设置为 block，则$modala_dialog.height() 为零
            $this.css('display', 'block');
            $modal_dialog.css({'margin-top': Math.max(0, (jq(window).height() - $modal_dialog.height()) / 2) });
        });

        modal_script_exec.modal.on('hide.bs.modal', function () {
            if (modal_script_exec.xhr) {
                if (modal_script_exec.xhr.readyState !== 4) {
                    modal_script_exec.xhr.abort()
                }
                modal_script_exec.xhr = null
            }
        });

        modal_script_exec.setOutput = function (output) {
            modal_script_exec.output.html(output);
            modal_script_exec.output.scrollTop(modal_script_exec.output.prop("scrollHeight"));
        };

        modal_script_exec.exec = function (script_name) {
            this.script_name.html(script_name);
            this.label_tips.html("running...");
            this.output.html('');
            this.modal.modal('show');

            try
            {
                var xhr = new XMLHttpRequest();
                xhr.open('POST', `/script/${script_name}`);
                xhr.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                xhr.onloadstart = function (evt) {
                    modal_script_exec.setOutput(xhr.response);
                };
                xhr.onprogress = function (evt) {
                    modal_script_exec.setOutput(xhr.response);
                };
                xhr.onload = function (evt) {
                    console.log('run', script_name, 'over');
                    modal_script_exec.label_tips.html('over');
                    modal_script_exec.setOutput(xhr.response);
                };
                xhr.onerror = function (evt ) {
                    console.log('run', script_name, 'error');
                    modal_script_exec.label_tips.html('error');
                };

                xhr.send(JSON.stringify({op:3}));

                this.xhr = xhr;
            }
            catch (e) {
                console.log(e);
                this.label_tips.html(e);
            }
        };
    }

    var $modal_script_edit = tab_scripts.find('#modal-script-edit');
    var modal_script_edit = {
        modal: $modal_script_edit,
        title: $modal_script_edit.find('#title'),
        input_script_name: $modal_script_edit.find('#input-script-name'),
        input_script_content: $modal_script_edit.find('#input-script-content'),
        btn_save: $modal_script_edit.find('#btn-save'),
        label_tips: $modal_script_edit.find('#label-tips'),

        isVisible: function () {
            return this.modal.is(':visible');
        }
    };
    {
        modal_script_edit.reset = function () {
            this.input_script_name.attr({'readonly': null, 'placeholder': null});
            this.input_script_content.attr({'readonly': null, 'placeholder': null});
            this.btn_save.attr('disabled', null);
            this.label_tips.html('');
        };

        modal_script_edit.reset();

        modal_script_edit.modal.modal({backdrop: false, show: false});

        modal_script_edit.modal.on('show.bs.modal', function(){
            var $this = jq(this);
            var $modal_dialog = $this.find('.modal-dialog');
            // 关键代码，如没将modal设置为 block，则$modala_dialog.height() 为零
            $this.css('display', 'block');
            $modal_dialog.css({'margin-top': Math.max(0, (jq(window).height() - $modal_dialog.height()) / 2) });
        });

        modal_script_edit.modal.on('hide.bs.modal', function () {
            console.log('edit hide');
            modal_script_edit.reset();
        });

        modal_script_edit.openNew = function () {
            this.title.html('Script New');
            this.input_script_name.val('').attr('placeholder', 'input name...');
            this.input_script_content.val('').attr('placeholder', 'input code...');
            this.btn_save.off('click').on('click', function () {
                console.log('new save click');

                let name = modal_script_edit.input_script_name.val();
                if (!name) {
                    modal_script_edit.label_tips.html('please enter name');
                    return;
                }

                if (scriptMap.get(name)) {
                    modal_script_edit.label_tips.html('script exist');
                    return;
                }

                let code = modal_script_edit.input_script_content.val();
                if (!code) {
                    modal_script_edit.label_tips.html('please enter code');
                    return;
                }

                modal_script_edit.btn_save.attr('disabled', '');
                modal_script_edit.label_tips.html('saving...').show();

                jq.ajax({
                    url: `/script/${name}`,
                    method: 'POST',
                    contentType: 'application/json; charset=UTF-8',
                    dataType: 'json',
                    data: JSON.stringify({op:0, content: modal_script_edit.input_script_content.val()}),

                    success: function (result) {
                        console.log(`save ${name}`, result);
                        if (modal_script_edit.isVisible()) {
                            if (result.code === 0) {
                                modal_script_edit.modal.modal('hide');
                                let item = createScriptItem(name);
                                addScriptItem(name, item);
                            } else {
                                modal_script_edit.label_tips.html(result.detail);
                            }
                        }
                    },

                    error: function (jqXHR, textStatus, errorThrown) {
                        let s = `${textStatus}: ${errorThrown}`;
                        console.error(`save ${name}`, s);
                        if (modal_script_edit.isVisible()) {
                            modal_script_edit.label_tips.html(s);
                        }
                    },

                    complete: function () {
                        if (modal_script_edit.isVisible()) {
                            modal_script_edit.btn_save.attr('disabled', null);
                        }
                    },
                });
            });

            this.modal.modal('show');
        };

        modal_script_edit.openEdit = function (name) {
            this.title.html('Script Edit');
            this.input_script_name.val(name).attr('readonly', '');
            this.input_script_content.val('').attr({'readonly': '', 'placeholder': null});
            this.label_tips.html('loading...');
            this.btn_save.off('click').on('click', function () {
                console.log('edit save click');

                modal_script_edit.btn_save.attr('disabled', '');
                modal_script_edit.label_tips.html('saving...').show();

                jq.ajax({
                    url: `/script/${modal_script_edit.input_script_name.val()}`,
                    method: 'POST',
                    contentType: 'application/json; charset=UTF-8',
                    dataType: 'json',
                    data: JSON.stringify({op:1, content: modal_script_edit.input_script_content.val()}),

                    success: function (result) {
                        console.log(`save ${modal_script_edit.input_script_name.val()}`, result);
                        if (modal_script_edit.isVisible()) {
                            if (result.code === 0) {
                                if (modal_script_edit.isVisible()) {
                                    modal_script_edit.modal.modal('hide');
                                }
                            } else {
                                if (modal_script_edit.isVisible()) {
                                    modal_script_edit.label_tips.html(result.detail);
                                }
                            }
                        }
                    },

                    error: function (jqXHR, textStatus, errorThrown) {
                        let s = `${textStatus}: ${errorThrown}`;
                        console.error(`save ${modal_script_edit.input_script_name.val()}`, s);
                        if (modal_script_edit.isVisible()) {
                            modal_script_edit.label_tips.html(s);
                        }
                    },

                    complete: function () {
                        if (modal_script_edit.isVisible()) {
                            modal_script_edit.btn_save.attr('disabled', null);
                        }
                    },
                });
            });
            this.modal.modal('show');

            jq.ajax({
                url: `/script/${name}`,
                method: 'GET',
                dataType: 'json',

                success: function (result) {
                    console.log(`load ${name}`, result);
                    if (modal_script_edit.isVisible()) {
                        if (result.code === 0) {
                            modal_script_edit.input_script_content.val(result.content).attr({'readonly': null, 'placeholder': 'input code...'});
                            modal_script_edit.btn_save.attr('disabled', null);
                            modal_script_edit.label_tips.html('');
                        } else {
                            modal_script_edit.label_tips.html(result.detail);
                        }
                    }
                },

                error: function (jqXHR, textStatus, errorThrown) {
                    let s = `${textStatus}: ${errorThrown}`;
                    console.error(`load ${name}`, s);
                    if (modal_script_edit.isVisible()) {
                        modal_script_edit.label_tips.html(s);
                    }
                },
            });
        };
    }

    tab_scripts.find('#btn-new-script').on('click', function () {
        modal_script_edit.openNew();
    });

    var $modal_script_rm = tab_scripts.find('#modal-script-rm');
    var modal_script_rm = {
        modal: $modal_script_rm,
        script_name: $modal_script_rm.find('#script-name'),
        btn_rm: $modal_script_rm.find('#btn-rm'),
        label_tips: $modal_script_rm.find('#label-tips'),
    };
    {
        modal_script_rm.modal.modal({backdrop: false, show: false});

        modal_script_rm.modal.on('show.bs.modal', function(){
            var $this = jq(this);
            var $modal_dialog = $this.find('.modal-dialog');
            // 关键代码，如没将modal设置为 block，则$modala_dialog.height() 为零
            $this.css('display', 'block');
            $modal_dialog.css({'margin-top': Math.max(0, (jq(window).height() - $modal_dialog.height()) / 2) });
        });

        modal_script_rm.isVisible = function () {
            return modal_script_rm.modal.is(':visible');
        };

        modal_script_rm.btn_rm.on('click', function () {
            let script_name = modal_script_rm.script_name.html();
            // modal_script_rm.btn_rm.attr('disabled', '');
            modal_script_rm.btn_rm.attr('disabled', '');

            jq.ajax({
                url: `/script/${script_name}`,
                method: 'POST',
                contentType: 'application/json; charset=UTF-8',
                dataType: 'json',
                data: JSON.stringify({op:2}),

                success: function (result) {
                    console.log('rm', script_name, result)
                    if (modal_script_rm.isVisible()) {
                        if (result.code === 0) {
                            rmScriptItem(script_name);
                            modal_script_rm.modal.modal('hide');
                        } else {
                            modal_script_rm.label_tips.html(result.detail);
                            modal_script_rm.btn_rm.attr('disabled', null);
                        }
                    }
                },

                error: function (jqXHR, textStatus, errorThrown) {
                    let s = `${textStatus}: ${errorThrown}`;
                    console.error('rm ', script_name, s);
                    modal_script_rm.label_tips.html(s);
                    modal_script_rm.btn_rm.attr('disabled', null);
                },

            });
        });

        modal_script_rm.open = function (name) {
            this.label_tips.html('');
            this.btn_rm.attr('disabled', null);
            this.script_name.html(name);
            this.modal.modal('show');
        };
    }

    jq('#tab-shell-scripts').on('show.bs.tab', function () {
        console.log("tab-scripts show!");

        scriptMap.clear();
        table_scripts_body.empty();

        jq.ajax({
            url: "/script",

            success: function(result) {
                console.log("get scripts", result);

                if (result.code === 0) {

                    for (let f of result.scripts) {
                        let file = f;
                        let item = createScriptItem(file);
                        addScriptItem(file, item);
                    }

                } else {
                    alert(result.detail)
                }

            },

            error: function (jqXHR, textStatus, errorThrown) {
                alert(`${textStatus}: ${errorThrown}`);
            },

        });

    })
}

function init_tab_processes() {
    var tab_processes = jq('#processes');
    var btn_search_processes = tab_processes.find('#btn-search-processes');
    var processes_details = tab_processes.find('#processes-details');
    var input_processes_key = tab_processes.find('#input-processes-key');
    var btn_stop_process = tab_processes.find('#btn-stop-process');
    var btn_kill = tab_processes.find('#btn-kill');
    var btn_interrupt = tab_processes.find('#btn-interrupt');
    var btn_terminate = tab_processes.find('#btn-terminate');
    var input_process_id = tab_processes.find('#input-process-id');

    var $warning = tab_processes.find('#warning');
    var warning = {
        $: $warning,
        content: $warning.find('#warning-content'),
    };
    warning.$.find('#btn-close').on('click', function () {
        warning.hide();
    });
    warning.show = function (content) {
        this.content.html(content);
        this.$.show(100);
    };
    warning.hide = function () {
        this.$.hide(100);
    };
    warning.$.hide();
    // input_process_id.popover({
    //     title: input_process_id.attr('placeholder'),
    //     delay: {show: 500, hide: 100},
    //     container: 'body',
    // });

    jq('#tab-processes').on('show.bs.tab', function (e) {
        console.log("tab-processes show!");
        btn_search_processes.trigger('click');
    });

    var stopProcess = function (id, signal) {
        if (id.length === 0) {
            // input_process_id.popover('show');
            warning.show('you must input process id!');
            return;
        }

        warning.hide();

        btn_stop_process.attr('disabled', '');

        jq.ajax({
            url: '/processes/stop',
            method: 'POST',
            contentType: 'application/json; charset=UTF-8',
            data:JSON.stringify({id: id, signal:signal}),
            dataType: 'json',
            success: function (data) {
                console.log(data);
                if (data.code === 1) {
                    warning.show(data.detail);
                }
            },

            error: function (xhr, textStatus, errorThrown) {
                console.log(textStatus, errorThrown);
                warning.show(data.detail);
            },

            complete: function () {
                btn_stop_process.attr('disabled', null)
            }
        });
    };

    btn_kill.on('click', function () {
        stopProcess(input_process_id.val(), 'kill');
    });
    btn_interrupt.on('click', function () {
        stopProcess(input_process_id.val(), 'interrupt')
    });
    btn_terminate.on('click', function () {
        stopProcess(input_process_id.val(), 'terminate')
    });

    // 查询 processes
    btn_search_processes.on('click', function () {
        var btn_text =  btn_search_processes.html();
        btn_search_processes.html('查询中')
        btn_search_processes.attr('disabled','');

        var url = "/processes?key=" + input_processes_key.val()

        console.debug("query processes, url=%s", url);

        jq.ajax({
            url: url,

            success: function (result) {
                processes_details.html(result)
            },

            error: function (jqXHR, textStatus, errorThrown) {
                processes_details.html(`${textStatus}: ${errorThrown}`)
            },

            complete: function () {
                btn_search_processes.html(btn_text)
                btn_search_processes.attr('disabled', null)
            },
        })

    });

    jq()
}



