/*
 * microphone-loopback@atareao.es
 * This extension enables hear microphone on headphones or speakers
 *
 * Copyright (C) 2018
 *     Lorenzo Carbonell <lorenzo.carbonell.cerezo@gmail.com>,
 *
 * This file is microphone-loopback@atareao.es
 * 
 * WordReference Search Provider is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WordReference Search Provider is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with gnome-shell-extension-openweather.
 * If not, see <http://www.gnu.org/licenses/>.
 */

imports.gi.versions.St = "1.0";
imports.gi.versions.Clutter = "1.0";
imports.gi.versions.Gtk = "3.0";
imports.gi.versions.Gio = "2.0";
imports.gi.versions.GLib = "2.0";


const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const MessageTray = imports.ui.messageTray;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

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


class MicrophoneLoopback extends PanelMenu.Button{
    constructor(){
        super(St.Align.START);
        this._settings = Convenience.getSettings();
        this._settingsChanged = this._settings.connect('changed', () => {
            this._toggleLoopback();
        });

        Gtk.IconTheme.get_default().append_search_path(
            Extension.dir.get_child('icons').get_path());

        let box = new St.BoxLayout();
        let label = new St.Label({text: 'Button',
                                   y_expand: true,
                                   y_align: Clutter.ActorAlign.CENTER });
        //box.add(label);
        this.icon = new St.Icon({icon_name: 'mic-off',
                                 style_class: 'system-status-icon'});
        box.add(this.icon);
        //box.add(PopupMenu.arrowIcon(St.Side.BOTTOM));
        this.actor.add_child(box);

        this.microphoneLoopbackSwitch = new PopupMenu.PopupSwitchMenuItem(_('Touchpad status'),
                                                                {active: true})
        this.microphoneLoopbackSwitch.label.set_text(_('Enable microphone loopback'));
        this.microphoneLoopbackSwitch.connect('toggled', (widget, value) => {
            this._settings.set_boolean('loopback', value);
            this._toggleLoopback();
        });
        this.menu.addMenuItem(this.microphoneLoopbackSwitch)
        this.settingsMenuItem = new PopupMenu.PopupMenuItem(_("Settings"));
        this.settingsMenuItem.connect('activate', () => {
            GLib.spawn_command_line_async(
                "gnome-shell-extension-prefs microphone-loopback@atareao.es"
            );
        });
        this.menu.addMenuItem(this.settingsMenuItem);
        this.menu.addMenuItem(this._get_help());

        this._loopback = -1;
        this._toggleLoopback();
    }

    _toggleLoopback(){
        let loopback = this._settings.get_boolean('loopback');
        log('ALDA', loopback);
        let latency = this._settings.get_int('latency');
        if(loopback){
            if(this._loopback == -1){
                let [res, out, err, status] = GLib.spawn_command_line_sync(
                    "pactl load-module module-loopback latency_msec=" + latency);
                this._loopback = parseInt(out);
                this.icon.set_icon_name('mic-on');
                this.microphoneLoopbackSwitch.label.set_text(_('Disable microphone loopback'));
                if(this._settings.get_boolean('notifications')){
                    notify('Microphone Loopback',
                           _('Microphone loopback enabled'),
                           'microphone-loopback');
                }
            }
        }else{
            if(this._loopback > -1){
                GLib.spawn_command_line_async(
                    "pactl unload-module " + this._loopback
                );
                this._loopback = -1;
                this.icon.set_icon_name('mic-off');
                this.microphoneLoopbackSwitch.label.set_text(_('Enable microphone loopback'));
                if(this._settings.get_boolean('notifications')){
                    notify('Microphone Loopback',
                           _('Microphone loopback disabled'),
                           'microphone-loopback');
                }
            }
        }
    }

    _create_help_menu_item(text, icon_name, url){
        let menu_item = new PopupMenu.PopupImageMenuItem(text, icon_name);
        menu_item.connect('activate', () => {
            Gio.app_info_launch_default_for_uri(url, null);
        });
        return menu_item;
    }

    _get_help(){
        let menu_help = new PopupMenu.PopupSubMenuMenuItem(_('Help'));
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('Project Page'), 'github', 'https://github.com/atareao/microphone-loopback'));
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('Get help online...'), 'help-online', 'https://www.atareao.es/aplicacion/microphone-loopback/'));
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('Report a bug...'), 'bug', 'https://github.com/atareao/microphone-loopback/issues'));
        menu_help.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('El atareao'), 'web', 'https://www.atareao.es'));
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('Follow me in Twitter'), 'twitter', 'https://twitter.com/atareao'));
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('Follow me in Facebook'), 'facebook', 'http://www.facebook.com/elatareao'));
        menu_help.menu.addMenuItem(this._create_help_menu_item(
            _('Follow me in Google+'), 'google', 'https://plus.google.com/118214486317320563625/posts'));
        return menu_help;
    }
    destroy() {
        this._settings.disconnect(this._settingsChanged);
    }
}


let microphoneLoopback;

function init(){
    Convenience.initTranslations();
    var settings = Convenience.getSettings();

}

function enable(){
    microphoneLoopback = new MicrophoneLoopback();
    Main.panel.addToStatusArea('MicrophoneLoopback', microphoneLoopback, 0, 'right');
}

function disable() {
    microphoneLoopback.destroy();
}