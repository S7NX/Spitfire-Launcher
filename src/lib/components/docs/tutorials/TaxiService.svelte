<script lang="ts">
  import BaseModal from '$components/docs/BaseModal.svelte';
  import YoutubeVideoEmbed from '$components/docs/YoutubeVideoEmbed.svelte';
</script>

<BaseModal>
  <h2>🚕 Taxi Service</h2>

  <h3>How to use the Taxi Service</h3>
  <ol>
    <li>
      Login to an account that you want to turn into a taxi bot. This account shouldn't be your main!
    </li>
    <li>
      Start the taxi service by clicking the button.
    </li>
    <li>
      Invite the taxi account to your party.
    </li>
    <li>
      Finally, set Team Fill to "No Fill" and start the mission.
    </li>
  </ol>

  <h3>Important Notes</h3>
  <ul>
    <li>
      Team Fill option must be set to "No Fill".
    </li>
    <li>
      The taxi bot lets you access high power level missions, however it can't take you to worlds like Twine Peaks until you complete your Storm Shield Defenses.
    </li>
    <li>
      The taxi works for both normal missions and ventures. No additional configuration is needed.
    </li>
  </ul>

  <YoutubeVideoEmbed title="Taxi Service Tutorial" videoId="CxV9W2FuY30"/>
</BaseModal>