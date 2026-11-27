import { useElicitation } from '@mcp-web/react';

/**
 * Shows the questions AI tools ask the user. This app asks yes-or-no
 * questions and questions with choices, where the first choice is the default.
 */
export function QuestionDialog() {
  const { request, respond } = useElicitation();
  if (!request) return null;

  const choices = (
    request.requestedSchema.properties.choice as { enum?: string[] } | undefined
  )?.enum;
  const cancel = () => respond({ action: 'cancel' });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop
    <div
      className="fixed inset-0 bg-(--color-accent-subtle) dark:bg-[#666]/80 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
      onClick={cancel}
      onKeyDown={(e) => {
        if (e.key === 'Escape') cancel();
      }}
      role="presentation"
    >
      <form
        // A new question starts with the default choice selected.
        key={JSON.stringify(request)}
        className="bg-white dark:bg-(--color-bg-alt) rounded-lg shadow-xl max-w-md w-full p-6 text-left"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="question-title"
        aria-describedby="question-message"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') cancel();
        }}
        onSubmit={(e) => {
          e.preventDefault();
          const choice = new FormData(e.currentTarget).get('choice');
          respond({
            action: 'accept',
            content: choices ? { choice: String(choice) } : {},
          });
        }}
      >
        <h2
          id="question-title"
          className="text-sm font-semibold uppercase tracking-wide opacity-60 mb-2"
        >
          AI asks
        </h2>
        <p id="question-message" className="text-lg text-(--color-text) mb-4">
          {request.message}
        </p>
        {choices && (
          <fieldset className="flex flex-col gap-2 mb-4">
            {choices.map((choice, i) => (
              <label
                key={choice}
                className="flex items-center gap-2 text-(--color-text) cursor-pointer"
              >
                <input
                  type="radio"
                  name="choice"
                  value={choice}
                  defaultChecked={i === 0}
                  className="accent-(--color-accent)"
                />
                {choice}
              </label>
            ))}
          </fieldset>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            // biome-ignore lint/a11y/noAutofocus: an alert dialog moves the focus into itself, onto the safest answer
            autoFocus
            onClick={() =>
              choices ? cancel() : respond({ action: 'decline' })
            }
            className="inline-flex items-center justify-center py-1.5 px-3 font-semibold text-xs uppercase tracking-wide bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-(--color-text) border-2 border-transparent rounded-md transition-all cursor-pointer select-none"
          >
            {choices ? 'Cancel' : 'No'}
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center pt-1.5 pb-1 px-3 font-semibold text-xs uppercase tracking-wide rounded-md bg-(--color-accent) text-(--color-bg) border-2 border-(--color-accent) shadow-[0_2px_0_var(--color-accent-dark)] btn-3d-press-sm hover:bg-(--color-accent-hover) hover:border-(--color-accent-hover) cursor-pointer select-none"
          >
            {choices ? 'OK' : 'Yes'}
          </button>
        </div>
      </form>
    </div>
  );
}
