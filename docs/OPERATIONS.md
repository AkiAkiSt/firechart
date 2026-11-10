# Firechart: running it

Things the person who runs the Supabase project may need to do. Commands are
run from the repository root on a machine where `npx supabase login` has been
done.

## Invite someone

Until the app has an invite screen (the Friends milestone), invites are made
with one command. Replace the code with one of your own: at least 8 characters,
and long and random enough that it cannot be guessed.

```bash
npx supabase db query --remote --yes "insert into public.invites (code, circle_id, max_uses, expires_at) select 'put-a-long-random-code-here', id, 1, now() + interval '7 days' from public.circles order by created_at limit 1"
```

Give the person the code, or the link `https://akiakist.github.io/firechart/#/join/<code>`.
A code works once and expires after a week unless you change those numbers.

## Someone forgot their password

There are no reset emails. Set a new password for them and tell them what it
is; they can keep it or you can repeat this later. This command has not been
exercised on the live project yet.

```bash
npx supabase db query --remote --yes "update auth.users set encrypted_password = extensions.crypt('the-new-password', extensions.gen_salt('bf')) where email = 'their@email'"
```

## The project was paused

Supabase pauses free projects after about a week without database activity and
emails a warning first. The `keep-alive` workflow makes a small request every
day to prevent this. If it happens anyway:

1. Open the project in the Supabase dashboard and choose **Resume project**.
2. Nothing is lost. While it was paused the app kept working on each device,
   and changes are sent once it is back.

GitHub turns scheduled workflows off after 60 days without activity in the
repository and emails you; re-enable `keep-alive` from the Actions tab.

## Backups

Supabase's free plan keeps none, so the `backup` workflow makes an encrypted
copy every Monday. It stays idle until two repository secrets exist.

Set it up once:

1. In the Supabase dashboard, open your account's **Access Tokens** page and
   generate a token named `firechart-backup`. Copy it.
2. Choose a long passphrase and store it in your password manager. Without it
   a backup cannot be read, by anyone.
3. In a terminal, run each of these and paste the value when asked. The values
   go straight to GitHub and are not shown again.

   ```bash
   gh secret set SUPABASE_ACCESS_TOKEN
   ```

   ```bash
   gh secret set BACKUP_PASSPHRASE
   ```

4. Run the workflow once to check it: Actions, **backup**, **Run workflow**.

Each run leaves a file named `firechart-<date>.sql.gpg` under the run's
artefacts for 90 days. It holds accounts, charts and ticks. Background photos
are not included; every device keeps its own copy and sends it again.

To read a backup:

```bash
gpg --decrypt firechart-2026-11-16.sql.gpg > data.sql
```

To restore into a new project: create the project, link it, apply the
migrations with `npx supabase db push --remote --yes`, then load `data.sql`
with `npx supabase db query --remote --yes --file data.sql`.

This path has not been exercised yet. Run a restore into a scratch project
once before relying on it.

## Changing the database

1. Add a migration under `supabase/migrations/` and extend
   `supabase/tests/database/` and `app/integration/` to cover it.
2. Push. The `database` workflow starts a throwaway Supabase stack, applies
   every migration and runs both suites. Nothing touches the real project.
3. When it is green: `npx supabase db push --remote --dry-run`, then
   `npx supabase db push --remote --yes`.
4. `npx supabase db advisors --remote` lists security notices. Two are
   expected: `redeem_invite` and `delete_my_account` are meant to be callable
   by signed-in users.

Never create test accounts on the real project. Tests that need accounts run
against the throwaway stack.

## Changing sign-in settings

They live in `supabase/config.toml`. `npx supabase config diff` shows what
differs from the project; `npx supabase config push --yes` applies it. Keep the
file in step with the project for anything you do not mean to change, so a push
never alters a setting by accident.
