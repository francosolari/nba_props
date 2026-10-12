import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import SuperlativeForm from './SuperlativeForm';
import PropForm from './PropForm';
import HeadToHeadForm from './HeadToHeadForm';
import ISTForm from './ISTForm';
import NBAFinalsForm from './NBAFinalsForm';
import { COMPOSER_TYPES } from '../questionTypes';

const LAST_TYPE_KEY = 'admin.composer.type';

const readLastType = () => {
  try {
    const saved = window.localStorage.getItem(LAST_TYPE_KEY);
    return COMPOSER_TYPES.some((type) => type.value === saved) ? saved : 'superlative';
  } catch {
    return 'superlative';
  }
};

// One composer instead of six stacked forms: pick a type, fill one form.
// Each form keeps its own draft in AdminPanel state, so switching types
// never loses what was typed.
const QuestionBuilders = ({
  onLaunchBatchWizard,
  forms,
  setters,
  options,
  mutations,
  defaultPointValue,
  activeSeason,
  ensureSeasonSelected,
  setError,
  handleMutation,
  classes,
  themeStyles,
}) => {
  const [activeType, setActiveType] = useState(readLastType);

  const chooseType = (value) => {
    setActiveType(value);
    try {
      window.localStorage.setItem(LAST_TYPE_KEY, value);
    } catch {
      // Remembering the last type is a convenience only.
    }
  };

  const shared = {
    defaultPointValue,
    activeSeason,
    ensureSeasonSelected,
    setError,
    handleMutation,
    classes,
    themeStyles,
  };

  const renderForm = () => {
    switch (activeType) {
      case 'prop':
        return (
          <PropForm
            {...shared}
            form={forms.propForm}
            setForm={setters.setPropForm}
            playerOptions={options.playerOptions}
            createProp={mutations.createProp}
          />
        );
      case 'head_to_head':
        return (
          <HeadToHeadForm
            {...shared}
            form={forms.headToHeadForm}
            setForm={setters.setHeadToHeadForm}
            teamOptions={options.teamOptions}
            playerOptions={options.playerOptions}
            createHeadToHead={mutations.createHeadToHead}
          />
        );
      case 'ist':
        return (
          <ISTForm
            {...shared}
            form={forms.istForm}
            setForm={setters.setIstForm}
            createIST={mutations.createIST}
          />
        );
      case 'nba_finals':
        return (
          <NBAFinalsForm
            {...shared}
            form={forms.nbaFinalsForm}
            setForm={setters.setNbaFinalsForm}
            createNBAFinals={mutations.createNBAFinals}
          />
        );
      default:
        return (
          <SuperlativeForm
            {...shared}
            form={forms.superForm}
            setForm={setters.setSuperForm}
            awardOptions={options.awardOptions}
            createSuperlative={mutations.createSuperlative}
          />
        );
    }
  };

  return (
    <section id="builders" className="court-admin-composer" aria-labelledby="composer-title">
      <header className="court-admin-composer__head">
        <h2 id="composer-title">New question</h2>
        <button type="button" onClick={onLaunchBatchWizard} className="court-admin-chip-btn">
          <Layers aria-hidden="true" className="h-4 w-4" />
          Batch create
        </button>
      </header>
      <div className="court-admin-type-picker" role="radiogroup" aria-label="Question type">
        {COMPOSER_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={activeType === type.value}
            onClick={() => chooseType(type.value)}
            className={activeType === type.value ? 'is-active' : ''}
          >
            {type.label}
          </button>
        ))}
      </div>
      <div className="court-admin-composer__form">{renderForm()}</div>
    </section>
  );
};

export default QuestionBuilders;
