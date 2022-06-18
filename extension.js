/*
 * This extension enables hear microphone on headphones or speakers
 *
 * Copyright (c) 2018 Lorenzo Carbonell Cerezo <a.k.a. atareao>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */


const {St, Clutter, Gtk, Gio, GObject, GLib} = imports.gi;

const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;


var MicrophoneLoopback = GObject.registerClass(
    class MicrophoneLoopback extends PanelMenu.Button{
        _init(){
            super._init(St.Align.START);
            this._settings = ExtensionUtils.getSettings();

            /* Icon indicator */
            let box = new St.BoxLayout();
            this.icon = new St.Icon({style_class: 'system-status-icon'});
            box.add(this.icon);
            this.add_child(box);

            this.microphoneLoopbackSwitch = new PopupMenu.PopupSwitchMenuItem(_('Microphone status'),
                                                                    {active: true})
            this.microphoneLoopbackSwitch.label.set_text(_('Enable microphone loopback'));
            this.microphoneLoopbackSwitch.connect('toggled', (widget, value) => {
                this._toggleSwitch(widget, value);
            });
            this.menu.addMenuItem(this.microphoneLoopbackSwitch)

            /* Separator */
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            /* Setings */
            this.settingsMenuItem = new PopupMenu.PopupMenuItem(_("Settings"));
            this.settingsMenuItem.connect('activate', () => {
                ExtensionUtils.openPrefs();
            });
            this.menu.addMenuItem(this.settingsMenuItem);

            this._set_icon_indicator(false);
            this._loadPreferences();
            this._settingsChanged = this._settings.connect('changed', () => {
                this._loadPreferences();
            });
        }

        _loadPreferences(){
            this._darktheme = this._getValue('darktheme');
            this._latency = this._getValue('latency');
            this._notifications = this._getValue('notifications')
            this._update();
        }

        _toggleSwitch(widget, value){
            try{
                let command;
                if(value == true){
                    command = ['pactl', 'load-module', 'module-loopback', `latency_msec=${this._latency}`];
                }else{
                    command = ['pactl', 'unload-module', 'module-loopback'];
                }
                let proc = Gio.Subprocess.new(
                    command,
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                proc.communicate_utf8_async(null, null, (proc, res) => {
                    try{
                        let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                        this._update();
                    }catch(e){
                        logError(e);
                    }
                });
            }catch(e){
                logError(e);
            }
        }

        _update(){
            let command;
            command = ['pactl', 'list', 'modules', 'short'];
            let proc = Gio.Subprocess.new(
                command,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            proc.communicate_utf8_async(null, null, (proc, res) => {
                try {
                    let [, stdout, stderr] = proc.communicate_utf8_finish(res);
                    let active;
                    active = (stdout.indexOf('module-loopback') > -1);
                    GObject.signal_handlers_block_by_func(this.microphoneLoopbackSwitch,
                                                          this._toggleSwitch);
                    this.microphoneLoopbackSwitch.setToggleState(active);
                    GObject.signal_handlers_unblock_by_func(this.microphoneLoopbackSwitch,
                                                            this._toggleSwitch);
                    let message;
                    this._set_icon_indicator(active);
                    if(active){
                        message = _('Microphone loopback enabled');
                    }else{
                        message = _('Microphone loopback disabled');
                    }
                    if(this._notifications){
                        Main.notify('Microphone Loopback', message);
                    }
                } catch (e) {
                    logError(e);
                }
            });
            return true;
        }

        _getValue(keyName){
            return this._settings.get_value(keyName).deep_unpack();
        }

        _set_icon_indicator(active){
            let themeString = (this._darktheme?'dark': 'light');
            let statusString = (active ? 'active' : 'paused');
            let iconString = `microphone-loopback-${statusString}-${themeString}`;
            this.icon.set_gicon(this._get_icon(iconString));
        }

        _get_icon(iconName){
            const basePath = Extension.dir.get_child("icons").get_path();
            let fileIcon = Gio.File.new_for_path(
                `${basePath}/${iconName}.svg`);
            if(fileIcon.query_exists(null) == false){
                fileIcon = Gio.File.new_for_path(
                `${basePath}/${iconName}.png`);
            }
            if(fileIcon.query_exists(null) == false){
                return null;
            }
            return Gio.icon_new_for_string(fileIcon.get_path());
        }

        disable() {
            this._settings.disconnect(this._settingsChanged);
        }
    }
);

let microphoneLoopback;

function init(){
    ExtensionUtils.initTranslations();
}

function enable(){
    microphoneLoopback = new MicrophoneLoopback();
    Main.panel.addToStatusArea('MicrophoneLoopback', microphoneLoopback, 0, 'right');
}

function disable() {
    microphoneLoopback.disable();
    microphoneLoopback = null;
}
