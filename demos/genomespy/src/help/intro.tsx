export function HelpIntro() {
  return (
    <div className="text-zinc-700 mb-6 space-y-2">
      <p>
        Write a{' '}
        <a
          href="https://genomespy.app"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          GenomeSpy
        </a>{' '}
        spec in the editor on the left and see the genomics chart on the right.
        Or let an AI agent create and edit the spec for you through MCP. You and
        the agent work on the same spec, so you can switch between the two at
        any time.
      </p>
      <p>
        With <strong>Code mode</strong> on, the agent changes the spec by
        writing a short JavaScript program instead of sending the whole spec
        back.
      </p>
    </div>
  );
}
