import '@things-factory/barcode-ui'
import { PropertyValues, html, css } from 'lit'


export const PdaCommonStyles = css`
        :host {
          display: flex;
          flex-direction: column;
          overflow: hidden;

          --grid-header-padding: 2px 0 2px 9px;
        }

        .pda-search-form {
          position: relative;
          display: grid;
          background-color:var(--search-form-background-color, var(--md-sys-color-surface));
          grid-template-columns: repeat(24, 1fr);
          grid-gap: var(--form-grid-gap);
          grid-auto-rows: minmax(24px, auto);
          padding: var(--spacing-small);
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }
        .pda-search-form label {
          grid-column: span 3;
          text-align: right;
          align-self: center;
          text-transform: capitalize;

          color: var(--md-sys-color-on-primary-container);
          font: var(--label-font);
        }
        
        label md-icon {
          --md-icon-size: var(--record-view-label-icon-size);
          display: inline-block;
          opacity: 0.5;
        }

        .pda-search-form input,
        .pda-search-form ox-input-barcode,
        .pda-search-form ox-select {
          grid-column: span 9;

          border: var(--input-field-border);
          border-bottom: 1px solid rgba(0, 0, 0, 0.2);
          border-radius: var(--input-field-border-radius);
          padding: var(--spacing-tiny);
          font: var(--input-field-font);
          max-width: 85%;
          color: var(--input-field-color, var(--md-sys-color-on-surface-variant));
          background-color: var(--md-sys-color-surface-container-lowest);
        }

        .pda-search-form ox-select, input[type='date'] {
          max-width: calc(85% + 18px);
        }

        .pda-search-form input[type='checkbox'],
        .pda-search-form input[type='radio'] {
          justify-self: end;
          align-self: center;
          grid-column: span 3 / auto;
          position: relative;
          left: 17px;
        }

        .pda-search-form input[type='checkbox'] + label,
        .pda-search-form input[type='radio'] + label {
          padding-left: 17px;
          text-align: left;
          align-self: center;
          grid-column: span 9 / auto;

          font: var(--form-sublabel-font);
          color: var(--form-sublabel-color, var(--md-sys-color-secondary));
        }
        ox-popup-list {
          max-height: 300px;
          overflow: auto;
        }

        input:focus {
          outline: none;
          border: 1px solid var(--focus-background-color);
        }
        input[type='checkbox'] {
          margin: 0;
        }

        [search] {
          position: absolute;
          right: 1%;
          bottom: 15px;
          color: var(--pda-search-form-icon-color, var(--md-sys-color-primary));
        }

        .tab-contents .pda-search-form{
          background-color:var(--md-sys-color-on-primary);
          border:var(--input-field-border)
        }
        .pda-search-form ox-input-barcode{
          background-color:transparent;
          --md-sys-color-on-primary:transparent;
          background:var(--barcodescan-input-button-icon) no-repeat 98.5% center;
        }

        @media screen and (max-width: 460px) {
          .pda-search-form {
            grid-template-columns: repeat(12, 1fr);
            grid-gap: var(--spacing-medium);
            background-color: var(--md-sys-color-surface);

            max-height: 100%;
            overflow-y: auto;
          }
          .pda-search-form label {
            padding-right: 5px;
            color: var(--md-sys-color-on-surface);
          }
          .pda-search-form input,
          .pda-search-form ox-select {
            grid-column: span 8;
            max-width: 100%;
            max-height:25px;
            color: var(--md-sys-color-on-surface);
          }
          .pda-search-form input[type='checkbox'],
          .pda-search-form input[type='radio'] {
            justify-self: end;
            align-self: center;
            grid-column: span 3 / auto;
          }

          .pda-search-form input[type='checkbox'] + label,
          .pda-search-form input[type='radio'] + label {
            grid-column: span 8 / auto;
            align-self: center;
            position: relative;
            left: 5px;
            color: var(--md-sys-color-on-surface);
          }

          [search] {
            right: 3%;
            color: var(--md-sys-color-on-surface);
          }

          .root_container {
            padding: 0 !important;
          }
        }
        @media (min-width: 461px) and (max-width: 1024px) {
          .pda-search-form ox-select {
            max-width: calc(85% + 10px);
          }
        }
        @media screen and (min-width: 1201px) and (max-width: 2000px) {
          .pda-search-form {
            grid-template-columns: repeat(36, 1fr);
          }
          .pda-search-form input,
          .pda-search-form ox-select {
            max-width: 90%;
          }
          .pda-search-form ox-select {
            max-width: calc(90% + 18px);
          }
        }

        @media screen and (min-width: 2001px) {
          .pda-search-form {
            grid-template-columns: repeat(48, 1fr);
          }
          .pda-search-form input,
          .pda-search-form ox-select {
            max-width: 90%;
          }
          .pda-search-form ox-select {
            max-width: calc(90% + 18px);
          }
          [search] {
            right: 0.8%;
          }
        }

        .ox-input-barcode {
          border-bottom: var(--record-view-edit-border-bottom);
        }

        .ox-grist {
          overflow-y: auto;
          flex: 1;
          min-height: 250px;
        }

        .tabs {
          display: flex;
        }

        .tab-contents {
          display: flex;
          flex: 1;
          flex-direction: column;
          overflow-x: overlay;
          background-color: var(--md-sys-color-background);
        }
        .tab {
          display: flex;
          gap: var(--spacing-small);
          background-color: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          margin-top: var(--margin-default);
          padding: var(--padding-narrow) var(--padding-wide) 0 var(--padding-wide);
          border-radius: 9px 9px 0 0;
          border-right: 1px solid rgba(0, 0, 0, 0.4);
          text-transform: capitalize;
          opacity: 0.7;
          font-size: 15px;
          cursor: pointer;
        }

        .tab[activate] {
          background-color: var(--md-sys-color-primary);
          color: var(--md-sys-color-on-primary);
          box-shadow: 2px -2px 2px 0px rgba(0, 0, 0, 0.15);
          opacity: 1;
          font-weight: bold;
        }

        .tab > md-icon {
          width: 15px;
          height: 20px;
          padding: 0;
          margin: 0;
          --md-icon-size: 15px;
          vertical-align: middle;
        }
        .root_container {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: var(--record-view-padding);
          overflow-y: auto;
          height: 100%;
          border-bottom: var(--record-view-border-bottom);
        }

        .content_container ox-select {
          grid-column: span 8;
          max-width: 100%;
          color: var(--md-sys-color-on-surface);
        }
      `;


