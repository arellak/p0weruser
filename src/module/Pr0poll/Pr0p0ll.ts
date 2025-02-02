import Settings from '@/core/Settings/Settings';
import Pr0p0llDiagramm from '@/lib/Pr0p0llDiagramm';
import overlayTemplate from "../../../assets/template/pr0p0llOverlay.html?raw";
import { ModuleSetting, PoweruserModule } from '@/types';
import Utils, { loadStyle } from "@/Utils";
import style from './pr0p0ll.less?inline';
import { GM_notification, GM_xmlhttpRequest } from "$";

export default class Pr0p0ll implements PoweruserModule {
    readonly id = 'Pr0p0ll';
    readonly name = 'Pr0p0ll Integration';
    readonly description = 'Erhalte Benachrichtigungen über neue Umfragen!';
    readonly showNotification = Settings.get('Pr0p0ll.settings.show_notification');
    token = Settings.get('Pr0p0ll.settings.user_token') as string;
    readonly showDiagramms = Settings.get('Pr0p0ll.settings.show_diagramms');
    readonly apiUrl = 'https://pr0p0ll.com/?p=viewjson&id=';
    readonly regionDe = new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'long',
      timeZone: 'Europe/Berlin'
    });

    inboxLink: HTMLElement;
    target: HTMLElement | null = null;
    template = `<a href="https://pr0p0ll.com/?p=user" target="_blank" class="empty pr0p0ll-count fa fa-edit head-link"><span>0</span></a>`;

    constructor() {
        this.inboxLink = document.getElementById('inbox-link')!;
    }


    async load() {
        this.inboxLink.after($(this.template)[0]);
        this.target = this.inboxLink.nextSibling!.firstChild! as HTMLElement;
        if (this.token) {
            this.addListener();
        }

        const _this = this;
        p.View.Overlay.Pr0p0llDiagramm = p.View.Base.extend({
            template: overlayTemplate,
            init: function (container: any, parent: any, params: any) {
                this.data.p0ll = params.data;
                this.data.dateTo = _this.regionDe.format(params.data.info.endedOn * 1000);
                this.data.dateFrom = _this.regionDe.format(params.data.info.endedOn * 1000 - params.data.info.duration * 1000);
                container[0].classList.add('pr0p0ll-overlay');
                this.parent(container, parent);
            }
        });
        loadStyle(style);
    }


    getSettings(): ModuleSetting[] {
        return [
            {
                id: 'show_notification',
                title: 'Desktopbenachrichtigung',
                description: 'Zeige eine Desktopbenachrichtigung bei neuen Umfragen!',
                type: "checkbox"
            },
            {
                id: 'show_diagramms',
                title: 'Diagramme anzeigen',
                description: 'Diagramme hinter pr0p0ll-links verlinken',
                type: "checkbox"
            },
            {
                id: 'user_token',
                title: '"Token für Notificator"',
                description: 'Damit authentifizierst du dich gegenüber pr0p0ll. [<a href="https://pr0p0ll.com/?p=tokengen" target="_blank">Token generieren</a>]',
                type: 'text'
            },
        ];
    }


    addListener() {
        const trimmedToken = this.token.trim();
        if (trimmedToken) {
            if (/^([0-9a-f]{64})$/.test(trimmedToken)) {
                this.token = trimmedToken.match("^([0-9a-f]{64})$")![0];
                Settings.set('Pr0p0ll.settings.user_token', this.token);

                window.addEventListener('userSync', () => {
                    this.fetchCounter().then((res: any) => {
                        this.updateCounter(res.openPolls);
                    });
                });

                if (this.showDiagramms) {
                    window.addEventListener('commentsLoaded', (e: any) => {
                        let links = e.data.find('a[href*="pr0p0ll"][href*="id="]').toArray();
                        this.addLinks(links);
                    });
                }
            }
            else {
                window.alert("Bitte öffne die Einstellungen, um einen korrekten Pr0po0ll-Token einzugeben.")
            }
        } else {
            window.alert('Bitte öffne die Einstellungen um das Pr0p0ll-Modul zu konfigurieren.');
        }
    }


    addLinks(links: any) {
        for (const element of links) {
            const url = new URL(element.href);
            let icon = document.createElement('a');
            icon.className = 'fa fa-bar-chart pr0p0ll-link';

            icon.addEventListener('click', () => {
                const pollId = url.searchParams.get('pollid');
                const id = parseInt(pollId !== null ? pollId : url.searchParams.get('id')!);

                Settings.set('Pr0p0ll.settings.last_count', String(0));

                this.showDiagramm(id);
            });

            element.after(icon);
        }
    }


    showDiagramm(id: number) {
        let getDiagramm = () => {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                  url: this.apiUrl + id,
                  method: "GET",
                  headers: {
                    "User-Agent": "p0weruser",
                  },
                  onload: (res) => {
                    const response = JSON.parse(res.responseText);

                    if (response.error) {
                      reject(response.error);
                    }

                    resolve(response);
                  },
                });
            });
        };

        getDiagramm().then(
            result => {
                p.mainView.showOverlay(p.View.Overlay.Pr0p0llDiagramm, {
                    data: result
                });

                const diag = new Pr0p0llDiagramm(result);
            },
            error => {
                window.alert(error);
            }
        );
    }


    fetchCounter() {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              url: `https://pr0p0ll.com/?p=notify&token=${this.token}`,
              method: "GET",
              headers: {
                "User-Agent": "p0weruser",
              },
              onload: (res) => {
                resolve(JSON.parse(res.responseText));
              },
            });
        })
    }


    updateCounter(score: number | any) {
        score = parseInt(score) || 0;
        if (this.showNotification && Settings.get('Pr0p0ll.settings.last_count') < score) {
            GM_notification(
              "Du hast " +
                (score === 1
                  ? "eine neue Umfrage!"
                  : score + " neue Umfragen!"),
              "pr0p0ll",
              "https://pr0p0ll.com/src/favicon.png",
              function () {
                window.focus();
                window.location.href = "https://pr0p0ll.com/?p=user";
              }
            );
        }

        (this.target!.parentNode! as HTMLElement).classList.toggle('empty', score === 0 || !score);
        this.target!.innerText = score;
        Settings.set('Pr0p0ll.settings.last_count', score);
    }
}
