import Settings from '@/core/Settings/Settings';
import { ModuleSetting, PoweruserModule, StreamItem } from '@/types';
import Utils, { loadStyle } from "@/Utils";
import style from './filterMarks.less?inline';

export default class FilterMarks implements PoweruserModule {
    readonly id = 'FilterMarks';
    readonly name = 'Filtermarkierung';
    readonly description = 'Markiert Medien entsprechend ihres Filters.';

    displayLabelDetails = Settings.get('FilterMarks.settings.detail_filters');
    displayLabelStream = Settings.get('FilterMarks.settings.stream_filters');
    displayBenisStream = Settings.get('FilterMarks.settings.stream_benis');


    static displayFilterLabel(itemData: any, $container: any) {
        let filter = FilterMarks.getFilter(itemData);
        let badge = document.createElement('span');
        badge.className = 'badge';
        badge.classList.toggle(filter);
        badge.innerText = filter.toUpperCase();

        $container.find('.item-details')[0].appendChild(badge);
    }


    static getFilter(itemData: any) {
        switch (itemData.flags) {
            case 1:
                return 'sfw';
            case 2:
                return 'nsfw';
            case 4:
                return 'nsfl';
            case 8:
                return 'nsfp';
            default:
                throw new Error("Uknown Filter");
        }
    }


    getSettings(): ModuleSetting[] {
        return [
            {
                id: 'stream_filters',
                title: 'Filter in Streams',
                description: 'Filterecken in Listen anzeigen?',
                type: "checkbox"
            },
            {
                id: 'detail_filters',
                title: 'Filter in Medienansicht',
                description: 'Filterlabel in der Detailansicht einblenden?',
                type: "checkbox"
            },
            {
                id: 'stream_benis',
                title: 'Benis beim Mouseover',
                description: 'Benis in der Übersicht einblenden?',
                type: "checkbox"
            }
        ];
    }


    async load() {
        this.overrideViews();
        loadStyle(style);
    }


    overrideViews() {
        let _this = this;

        if (this.displayLabelStream || this.displayBenisStream) {
            // Handle stream-view
            p.View.Stream.Main.prototype.buildItem = function (item: StreamItem) {
                const shouldShowPreview = !p.mobile && !!item.preview;
                return `
                    <a class="silent thumb filter ${_this.displayLabelStream ? FilterMarks.getFilter(item) : ''}" ${shouldShowPreview ? `data-has-preview="true"` : ''} id="item-${item.id}" href="${this.baseURL + item.id}">
                        <p-thumbnail
                            itemId="${item.id}"
                            thumbSrc="${item.thumb}"
                            ${item.preview ? `previewSrc="${item.preview}"` : ""}
                        ></p-thumbnail>
                        ${_this.displayBenisStream ? `
                        <span
                            class="benis-info ${item.up - item.down > 0 ? 'up' : 'down'}">
                            ${item.up - item.down}
                        </span>` : ''}
                        ${shouldShowPreview ? `
                        <video
                            class="inline-preview-video"
                            preload="none"
                            loop
                            muted
                            width="128"
                            height="128"
                            src="${item.preview}"
                        >` : ''}
                        ${item.promoted > 1000000000 ? '<div class="sticky-badge"></div>' : ''}
                    </a>
                `;
            };
        }

        if (this.displayLabelDetails) {
            // Handle detail-view

            if (_this.displayLabelDetails) {
              window.addEventListener("itemOpened", (ev: Event & any ) => {
                  FilterMarks.displayFilterLabel(ev.data.itemData, ev.data.$container);
              });
            }
        }

        // Fix audio-controls
        Utils.addVideoConstants();
    }
}
