import React from 'react';
import SuperlativeForm from './SuperlativeForm';
import PropForm from './PropForm';
import PlayerStatForm from './PlayerStatForm';
import HeadToHeadForm from './HeadToHeadForm';
import ISTForm from './ISTForm';
import NBAFinalsForm from './NBAFinalsForm';

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
}) => (
  <section id="builders" className="space-y-8">
    <div className={classes.batchCardClass}>
      <div>
        <h2 className={classes.headingClass}>Launch batch creator</h2>
        <p className={classes.subheadingClass}>
          Draft multiple questions with a guided flow. Perfect when seeding a new season.
        </p>
      </div>
      <button
        type="button"
        onClick={onLaunchBatchWizard}
        className={`${classes.primaryButtonClass} md:w-auto`}
      >
        Batch create questions
      </button>
    </div>

    <div className="grid gap-8 lg:grid-cols-2">
      <SuperlativeForm
        form={forms.superForm}
        setForm={setters.setSuperForm}
        awardOptions={options.awardOptions}
        defaultPointValue={defaultPointValue}
        activeSeason={activeSeason}
        ensureSeasonSelected={ensureSeasonSelected}
        setError={setError}
        handleMutation={handleMutation}
        createSuperlative={mutations.createSuperlative}
        classes={classes}
        themeStyles={themeStyles}
      />
      <PropForm
        form={forms.propForm}
        setForm={setters.setPropForm}
        playerOptions={options.playerOptions}
        defaultPointValue={defaultPointValue}
        activeSeason={activeSeason}
        ensureSeasonSelected={ensureSeasonSelected}
        handleMutation={handleMutation}
        createProp={mutations.createProp}
        classes={classes}
        themeStyles={themeStyles}
      />
      <PlayerStatForm
        form={forms.playerStatForm}
        setForm={setters.setPlayerStatForm}
        defaultPointValue={defaultPointValue}
        activeSeason={activeSeason}
        ensureSeasonSelected={ensureSeasonSelected}
        setError={setError}
        handleMutation={handleMutation}
        createPlayerStat={mutations.createPlayerStat}
        classes={classes}
        themeStyles={themeStyles}
      />
      <HeadToHeadForm
        form={forms.headToHeadForm}
        setForm={setters.setHeadToHeadForm}
        teamOptions={options.teamOptions}
        defaultPointValue={defaultPointValue}
        activeSeason={activeSeason}
        ensureSeasonSelected={ensureSeasonSelected}
        setError={setError}
        handleMutation={handleMutation}
        createHeadToHead={mutations.createHeadToHead}
        classes={classes}
        themeStyles={themeStyles}
      />
      <ISTForm
        form={forms.istForm}
        setForm={setters.setIstForm}
        defaultPointValue={defaultPointValue}
        activeSeason={activeSeason}
        ensureSeasonSelected={ensureSeasonSelected}
        handleMutation={handleMutation}
        createIST={mutations.createIST}
        classes={classes}
        themeStyles={themeStyles}
      />
      <NBAFinalsForm
        form={forms.nbaFinalsForm}
        setForm={setters.setNbaFinalsForm}
        defaultPointValue={defaultPointValue}
        activeSeason={activeSeason}
        ensureSeasonSelected={ensureSeasonSelected}
        handleMutation={handleMutation}
        createNBAFinals={mutations.createNBAFinals}
        classes={classes}
        themeStyles={themeStyles}
      />
    </div>
  </section>
);

export default QuestionBuilders;
