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


const {St, Clutter, Gtk, Gio, GObjetct, GLib} = imports.gi;

const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();

const Gettext = imports.gettext.domain(Extension.uuid);
const _ = Gettext.gettext;

var button;

function notify(msg, details, icon='microphone-loopback') {
    let source = new MessageTray.Source(Extension.uuid, icon);
    Main.messageTray.add(source);
    let notification = new MessageTray.Notification(source, msg, details);
    notification.setTransient(true);
    source.notify(notification);
}

var MicrophoneLoopback = GObject.registerClass(
    class MicrophoneLoopback extends PanelMenu.Button{
        _init(){
            super(St.Align.START);
            this._settings = ExtensionUtils.getSettings();
            this._loadPreferences();

            /* Icon indicator */
            let box = new St.BoxLayout();
            this.icon = new St.Icon({icon_name: 'mic-off',
                                     style_class: 'system-status-icon'});
            box.add(this.icon);
            this.add_child(box);

            this.microphoneLoopbackSwitch = new PopupMenu.PopupSwitchMenuItem(_('Microphone status'),
                                                                    {active: true})
            this.microphoneLoopbackSwitch.label.set_text(_('Enable microphone loopback'));
            this.microphoneLoopbackSwitch.connect('toggled', (widget, value) => {
                this._toggleLoopback(value);
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
            this._reload();
        }

        _reload(){
            GLib.spawn_command_line_sync("pactl unload-module module-loopback");
            if(this.microphoneLoopbackSwitch._switch.state){
                GLib.spawn_command_line_sync(
                    `pactl load-module module-loopback latency_msec=${this._latency}`);
            }
        }

        _toggleLoopback(loopback){
            if(loopback){
                let [res, out, err, status] = GLib.spawn_command_line_sync(
                    `pactl load-module module-loopback latency_msec=${this._latency}`);
                this._set_icon_indicator(true);
                this.microphoneLoopbackSwitch.label.set_text(_('Disable microphone loopback'));
                if(this._settings.get_boolean('notifications')){
                    notify('Microphone Loopback',
                           _('Microphone loopback enabled'),
                           'microphone-loopback');
                }
            }else{
                GLib.spawn_command_line_sync("pactl unload-module module-loopback");
                this._set_icon_indicator(true);
                this.microphoneLoopbackSwitch.label.set_text(_('Enable microphone loopback'));
                if(this._settings.get_boolean('notifications')){
                    notify('Microphone Loopback',
                           _('Microphone loopback disabled'),
                           'microphone-loopback');
                }
            }
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
