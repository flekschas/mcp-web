# The Story Behind MCP-Web

> Fritz, Feb 9 2026

First of all, congrats on finding this page 🙌 It hopefully means MCP-Web got
you curious or you might even use it. In either case, the following is a bit of
a reflection about the journey building MCP-Web with Claude.

## Why I Created MCP-Web

MCP-Web started out of curiosity. I wanted to know if it's possible to control
visual web-based data interfaces through AI while allowing users to remain
in full control and be able to take over at any point.

Visual interfaces, like dashboards or visual analytics apps, are different from
other interfaces for two reasons. First, such interfaces often have a rich
ephemeral view model to enable exploration. And such models are often much
larger than the data model. Think of crossfilters, camera settings, or display
configurations. And second, while some interactions are more efficient with
natural language, others are better suited for pointer events. E.g., comparing
two datasets is faster expressed in natural language while manipulating the
camera position to your liking is much faster using a pointer interface.

MCP-Web is the result of me and Claude exploring how to make it as easy as
possible to build frontend apps that both humans and AI control equally well.

### Human-AI Parity

A core principle that underpins MCP-Web and the design philosophy behind it
is to ensure the human user never loses agency while at the same time enabling
AI to effectively operate a frontend app. There should be parity between both.
Whatever the human can do the AI should be able to do and vice versa.

In the past, user interfaces were purely written for humans. Sure there was no
working AI back then so one could argue it made sense but even then it would
have made sense to build apps declaratively such that different software can
interoperate seamlessly. With modern LLMs, there's really no excuse anymore to
having to fight with poorly-designed or overly complex user interfaces. Even
when complex UIs are unavoidable. And they can be, trust me, I've built many
myself. LLMs enable us to make any software accessible through natural language.

The flip side, of course, is optimizing only for AI. As great as LLMs are at
automating tedious interactions, they can fail. Either by making genuine
mistakes, or by the user not specifying their intent correctly. In either case
it's important to ensure the user can take over at any time to intervene if they
need to.

With human-AI parity, the user can choose which route to take, how much to
automate with AI and when to take over. And it turns out, it's fairly
easy to achieve parity!

## Two Ideas That Make Parity Easy

### Frontend as the Main Control Gateway

The key design decision with MCP-Web, and maybe the most fundamental
difference between a regular MCP setup and MCP-Web, is that with MCP-Web you
make the frontend the _main control gateway_ to data. Instead of having an AI
agent operate through MCP on the data and pushing updates to the frontend, with
MCP-Web both the human and AI are essentially using the same channel: the
frontend state.

The human controls the frontend state through a graphical user interface while
AI controls it through tools. The key is that both interfaces manipulate the
very same state. While it doesn't guarantee parity between humans and AI, this
design at least makes it much easier to achieve parity. You just need to ensure
that every state can be controlled through a GUI and an MCP tool.

As with every design choice, making the frontend the main gateway comes with
tradeoffs. First and foremost, it requires the user to run the frontend app in
the browser to interact with it. This requirement also limits some use cases
like multi-user interactions. However, for visual interfaces and dashboards,
which are meant to be seen by the user and that have rich view states, I
believe this tradeoff is justified.

This design choice has another benefit: exposing UI components to AI agents
becomes trivial. [MCP apps](https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/),
the new extension to MCP for exposing user interfaces, let AI agents render UI
for human consumption. Since the frontend already defines all UI as components,
you can expose them directly from where they're defined, rather than duplicating
the UI logic.

All this brings us to the question of what it takes, on a technical level, to
achieve full AI controllability.

### Declarative Reactive Frontend State

One of the main learnings from building MCP-Web is that 99% of the work to make
a frontend app AI controllable has nothing to do with AI and everything to do
with structuring your frontend state well.

::: tip tl;dr
Well-described declarative reactive state is all you need.
:::

At the end of the day, if you model your state declaratively and break it up
into atomic and derived units, then it's dead simple to enable AI to control
your frontend app. Just expose the atomic units as tools. The only other key
ingredient you need are well-described schemas. That's it. You're done! 🎉

Of course, there are nuances. Some states might need to be synchronized to avoid
flickering and other states you might need content validation in addition to
schema validation. But those things are easy to add if your state follows
the declarative reactive framework.

One might point out that AI is also becoming better and better at understanding,
navigating, and controlling rendered websites of all kinds. This is true and the
performance will for sure only getting better over time. However, I'd argue it's
always more efficient and effective to offer declarative schemas as they take
guessing out of the game and will always be token efficient. Especially for
bespoke data visualizations, some interaction patterns might require parsing
minified JavaScript code, which just seems like a waste of compute.

## Learnings From Coding with Claude

Another reason for creating MCP-Web was that it provided me an excuse to see how
far I can get with AI coding tools like Claude Code. Needless to say you can get
very far very quickly if you know where you want to go. And the progress from
when I started working on this last October to now is mind-boggling. With AI
coding becoming cheaper, faster, and better month by month, I find it matters
more and more _what_ and _why_ you want to build.

### Knowing _What_ You Want to Implement

I keep coming back to the question of _what_ to build ever since I listened to
the Hard Fork episode where Casey Newton and Kevin Roose interviewed Gary
Greenberg who psychoanalyzed ChatGPT. Greenberg at one point said something
along the lines of "if asking questions and getting feedback essentially becomes
free, what matters is which questions you actually want to ask".

When it comes to AI coding, I think the very same is true. If you have the
financial means to pay for an AI coding tool, writing code is essentially
"free". The hard part then boils down to figuring out what exactly you want to
implement and why. I.e., what problem is your software product trying to solve?
Do your users actually have that problem? And is there even a reason to build
shared software rather than letting each user have AI create their own bespoke
solution? In other words, do the inevitable constraints your software imposes on
users enable something new?

Once you've figured out these fundamental questions and you move to the
coding phase, I learned that it matters just as much how you ask AI. The
challenge is that the framing questions can inadvertently constrain the answers.
If I ask "Should I use option A or B?", AI will likely
pick one, even when the real answer might be "Neither, consider C instead." To
avoid this, I find it better to pose open-ended questions, like "What viable
approaches can you imagine for X?", to prevent priming the conversation. (The
same is true for human collaboration by the way). So beyond knowing _what_ to
build, I find it's important to know how to ask the right question.

I wish there was a dedicated _explore_ or _discuss_ mode in Claude Code that
focuses on offering different perspectives. Planning is great when you already
know where you want to go and "only" want to flesh out the path of how to get to
your target. I know you can get there using skills but it'd be wonderful if this
was a first class feature. What, for instance, if your goal is not optimal? Or
if there's a totally different approach that'd turn out to be better?

### The Old is The New

Many discoveries in this new age of AI software engineering are rediscoveries of
things that were known for a long time.

For instance, execution is easier than planning, which is why it takes a lot
longer to write a PhD thesis than a Bachelor thesis. For the latter your
professor has already created a plan for you to execute while a PhD requires you
to come up with a research plan yourself. And related to knowing _what to ask_
AI to code, the hardest step is finding out what research to conduct and plan
out.

Another example are evals, which are a hot topic everywhere right now. But evals
are essentially just codified ways of grading, which teachers and professors
had to deal with for centuries. I would also argue evals are just tests with
non-deterministic outcomes that need grading. You're testing against a
distribution of outcomes instead of a single outcome.

Lastly, AI agent workflows and orchestration from a conceptual execution point
of view share a lot of similarity with what computer scientists in the
human-computer interaction community have studied under the topic of
crowdsourcing. In both cases you deal with agents you cannot perfectly predict
and that may or may not give you correct results.

Treating all problems as new when the technology changes is not a new phenomenon
by any means. But while there's a lot of excitement around the new, I find it
helpful to remind myself that many challenges we run into with AI coding have
historic parallels that offer useful learnings.

MCP-Web itself is a good example. Almost nothing in it is truly new. Declarative
state? Established long ago in SQL, functional programming, and the grammar of
graphics. Reactive frontend state? Knockout.js introduced computed observables
over a decade ago. The patterns are old; the context is new.

## What's Next?

I'm pretty happy with the approach behind MCP-Web and what it can already do
but it's far from done. As always there are more things we can and will add.
For now, I'm curious to see if others will find this library useful as well or
whether I failed in my belief or approach to AI controllable frontend apps that
offer human-AI parity.

In any case, it was fun building MCP-Web with Claude and at the very least I
learned a bunch myself.
