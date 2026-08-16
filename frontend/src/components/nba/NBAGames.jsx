import React from 'react';
import TeamLogo from '../TeamLogo';

/**
 * NBA games in the Courtside Album's ruled language.
 *
 * One data shape, three forms, so the same feed can be dropped anywhere:
 *
 * - `rail`   a compact ruled list, for a homepage sidebar or panel;
 * - `ticker` a continuous marquee, for a masthead strip;
 * - `day`    a roomier listing with arena and broadcast, for schedule pages.
 *
 * Games come from `useNbaSchedule`; this component only renders them, so it can
 * also be handed a list from anywhere else with the same shape.
 */

const TIME_ONLY = { hour: 'numeric', minute: '2-digit' };
const WITH_DAY = { weekday: 'short', month: 'short', day: 'numeric', ...TIME_ONLY };

function formatTip(iso, options) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, options);
}

function Side({ team, showRecord }) {
  return (
    <span className="nba-games__side">
      <TeamLogo teamName={team.name} slug={team.slug} alt="" />
      <b>{team.tricode}</b>
      {showRecord && (team.wins || team.losses) ? <s>{team.wins}–{team.losses}</s> : null}
    </span>
  );
}

function Score({ game }) {
  if (game.status === 'scheduled') return null;
  return (
    <span className="nba-games__score">
      {game.away.score}–{game.home.score}
    </span>
  );
}

function GameRow({ game, variant }) {
  const isDay = variant === 'day';
  const live = game.status === 'live';

  return (
    <div className={`nba-games__row${live ? ' is-live' : ''}`}>
      <span className="nba-games__matchup">
        <Side team={game.away} showRecord={isDay} />
        <i>at</i>
        <Side team={game.home} showRecord={isDay} />
      </span>
      <span className="nba-games__meta">
        <Score game={game} />
        <em>
          {live ? 'Live' : game.status === 'final' ? 'Final' : formatTip(game.tipoff, isDay ? TIME_ONLY : WITH_DAY)}
        </em>
        {isDay && game.arena ? <small>{game.arena}</small> : null}
        {game.national_tv ? <u>{game.national_tv}</u> : null}
      </span>
    </div>
  );
}

function TickerItem({ game }) {
  const live = game.status === 'live';
  return (
    <span className={`nba-games__tick${live ? ' is-live' : ''}`}>
      <TeamLogo teamName={game.away.name} slug={game.away.slug} alt="" />
      <b>{game.away.tricode}</b>
      {game.status === 'scheduled' ? null : <s>{game.away.score}</s>}
      <i>@</i>
      <TeamLogo teamName={game.home.name} slug={game.home.slug} alt="" />
      <b>{game.home.tricode}</b>
      {game.status === 'scheduled' ? null : <s>{game.home.score}</s>}
      <em>{live ? 'Live' : game.status === 'final' ? 'Final' : formatTip(game.tipoff, WITH_DAY)}</em>
    </span>
  );
}

export default function NBAGames({ games = [], variant = 'rail', title, caption, action }) {
  if (!games.length) return null;

  if (variant === 'ticker') {
    // The strip scrolls continuously, so the list is duplicated to make the
    // wrap seamless; the copy is hidden from assistive tech.
    return (
      <div className="nba-games nba-games--ticker" aria-label={title || 'NBA scores'}>
        <div className="nba-games__marquee">
          <div className="nba-games__track">
            {games.map((game) => <TickerItem key={game.game_id} game={game} />)}
          </div>
          <div className="nba-games__track" aria-hidden="true">
            {games.map((game) => <TickerItem key={`${game.game_id}-echo`} game={game} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`nba-games nba-games--${variant}`}>
      {title ? (
        <header className="next-play-section-head">
          <div><h2>{title}</h2>{caption ? <p>{caption}</p> : null}</div>
          {action}
        </header>
      ) : null}
      <div className="nba-games__rows">
        {games.map((game) => <GameRow key={game.game_id} game={game} variant={variant} />)}
      </div>
    </section>
  );
}
