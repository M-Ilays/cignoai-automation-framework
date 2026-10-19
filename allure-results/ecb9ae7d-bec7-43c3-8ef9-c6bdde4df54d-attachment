# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard\deliverable\deliverable-edits-sync.spec.ts >> Feature: Edits sync (TC-017) >> 
        Test case: 'TC-017'
        Description: 'sample deliverable — Brief + Settings edits → Reset / Regenerate → return to prior views and verify sync'
        Tags: '@regression @deliverable @sync @slow'
      
- Location: src\specs\dashboard\deliverable\deliverable-edits-sync.spec.ts:11:7

# Error details

```
Error: Deliverable "sample deliverable" should appear after searching in Search Clients

Deliverable "sample deliverable" should appear after searching in Search Clients

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false

Call Log:
- Timeout 45000ms exceeded while waiting on the predicate
```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - button "Cigno Cigno" [ref=e7] [cursor=pointer]:
        - img "Cigno" [ref=e9]
        - generic [ref=e10]: Cigno
      - button "Create New Deliverable" [ref=e13] [cursor=pointer]:
        - img [ref=e14]
        - generic [ref=e15]: Create New Deliverable
      - generic [ref=e17]:
        - img [ref=e18]
        - textbox "Search Clients" [active] [ref=e21]: sample deliverable
        - button [ref=e22] [cursor=pointer]:
          - img [ref=e23]
      - generic [ref=e25]:
        - generic [ref=e27]:
          - button "Collapse SHARED WORK WITH CLIENT section" [expanded] [ref=e28] [cursor=pointer]:
            - generic [ref=e29]: SHARED WORK WITH CLIENT
          - button "Add item to SHARED WORK WITH CLIENT" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
          - button "Collapse SHARED WORK WITH CLIENT section (chevron)" [ref=e32] [cursor=pointer]:
            - img [ref=e33]
        - generic [ref=e37]:
          - generic [ref=e38]: No results found for "sample deliverable"
          - button "Clear search" [ref=e39] [cursor=pointer]
        - generic [ref=e40]:
          - generic [ref=e41]:
            - button "Collapse PRIVATE SESSION section" [expanded] [ref=e42] [cursor=pointer]:
              - generic [ref=e43]: PRIVATE SESSION
            - button "Collapse PRIVATE SESSION section (chevron)" [ref=e45] [cursor=pointer]:
              - img [ref=e46]
          - paragraph [ref=e49]: No matching private sessions
      - button "Collapse menu" [ref=e50] [cursor=pointer]:
        - img [ref=e51]
      - separator [ref=e53]
      - generic [ref=e57]:
        - generic [ref=e58]:
          - img "Hassan Ahmad" [ref=e60]
          - generic [ref=e61]:
            - paragraph [ref=e62]: Hassan Ahmad
            - paragraph [ref=e63]: qa.hassan12@gmail.com
        - button "Logout" [ref=e64] [cursor=pointer]:
          - img [ref=e65]
    - generic [ref=e68]:
      - generic [ref=e69]:
        - generic [ref=e72]:
          - generic [ref=e73]: ...
          - generic [ref=e74]:
            - generic [ref=e75]: /
            - link "Dashboard" [ref=e76] [cursor=pointer]:
              - /url: /dashboard
              - generic [ref=e77]: Dashboard
          - generic [ref=e78]:
            - generic [ref=e79]: /
            - button "New work session" [ref=e81]
        - generic [ref=e82]:
          - heading "Good Morning, Hassan Ahmad" [level=1] [ref=e83]
          - generic [ref=e84]:
            - textbox "Type something here" [ref=e86]
            - generic [ref=e87]:
              - button "Attach file" [ref=e89] [cursor=pointer]:
                - img [ref=e90]
              - generic [ref=e92]:
                - button "Build a Deliverable" [ref=e94] [cursor=pointer]:
                  - img [ref=e95]
                  - text: Build a Deliverable
                - button "Submit" [disabled] [ref=e98]:
                  - img [ref=e100]
          - generic [ref=e103]:
            - button "Start a new brief" [ref=e104] [cursor=pointer]:
              - img [ref=e105]
              - text: Start a new brief
            - button "Explore market data" [ref=e108] [cursor=pointer]:
              - img [ref=e109]
              - text: Explore market data
            - button "Draft a proposal" [ref=e112] [cursor=pointer]:
              - img [ref=e113]
              - text: Draft a proposal
            - button "Commercial due diligence" [ref=e117] [cursor=pointer]:
              - img [ref=e118]
              - text: Commercial due diligence
      - img [ref=e123]
  - alert [ref=e129]
```

# Test source

```ts
  843 |     options?: { clientLabel?: string; projectLabel?: string },
  844 |   ): Promise<Locator | null> {
  845 |     const shell = this.clientTreeAsideOrShell();
  846 |     const clientLabel = options?.clientLabel?.trim();
  847 |     const projectLabel = options?.projectLabel?.trim();
  848 | 
  849 |     await this.searchClients(label);
  850 |     await this.page.waitForTimeout(400);
  851 |     let target = await this.findDeliverableRowInTree(shell, label, options);
  852 |     if (target) {
  853 |       return target;
  854 |     }
  855 | 
  856 |     await this.clearClientSearch();
  857 |     await this.page.waitForTimeout(400);
  858 |     if (clientLabel && projectLabel) {
  859 |       await this.expandClientProjectTreeInShell(clientLabel, projectLabel);
  860 |       target = await this.findDeliverableRowInTree(shell, label, options);
  861 |     }
  862 | 
  863 |     return target;
  864 |   }
  865 | 
  866 |   /**
  867 |    * Open the first deliverable found in the sidebar (primary name, then fallbacks).
  868 |    * @returns The deliverable label that was opened.
  869 |    */
  870 |   public async openDeliverableFromSidebarWithFallback(
  871 |     deliverableNames: string[],
  872 |     options?: {
  873 |       clientLabel?: string;
  874 |       projectLabel?: string;
  875 |       confirmStorylineLeave?: boolean;
  876 |       skipStageReadyWait?: boolean;
  877 |       waitUntilLeftDeliverable?: string;
  878 |     },
  879 |   ): Promise<string> {
  880 |     const candidates = [...new Set(deliverableNames.map((n) => n.trim()).filter((n) => n.length > 0))];
  881 |     if (candidates.length === 0) {
  882 |       throw new Error('At least one deliverable name is required.');
  883 |     }
  884 | 
  885 |     const errors: string[] = [];
  886 |     for (const label of candidates) {
  887 |       try {
  888 |         await this.openDeliverableFromSidebar(label, options);
  889 |         return label;
  890 |       } catch (error) {
  891 |         errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  892 |         await this.clearClientSearch().catch(() => undefined);
  893 |         await this.page.waitForTimeout(300);
  894 |       }
  895 |     }
  896 | 
  897 |     throw new Error(
  898 |       `No deliverable found in sidebar tree. Tried: ${candidates.join(', ')}. Details: ${errors.join(' | ')}`,
  899 |     );
  900 |   }
  901 | 
  902 |   public async openDeliverableFromSidebar(
  903 |     deliverableName: string,
  904 |     options?: {
  905 |       clientLabel?: string;
  906 |       projectLabel?: string;
  907 |       /** Click **Proceed** when leaving a deliverable with storyline generation in progress. */
  908 |       confirmStorylineLeave?: boolean;
  909 |       /** Skip Brief stepper wait (e.g. generated deliverable / 3. Deliverable view). */
  910 |       skipStageReadyWait?: boolean;
  911 |       /** After navigation, wait until this deliverable is no longer shown in the main header. */
  912 |       waitUntilLeftDeliverable?: string;
  913 |     },
  914 |   ): Promise<void> {
  915 |     const label = deliverableName.trim();
  916 |     if (!label) {
  917 |       throw new Error('Deliverable name must be non-empty.');
  918 |     }
  919 | 
  920 |     await test.step(`Open deliverable "${label}" from sidebar`, async () => {
  921 |       const clientLabel = options?.clientLabel?.trim();
  922 |       let target: Locator | null = null;
  923 | 
  924 |       await this.clearClientSearch();
  925 |       await this.searchClients(label);
  926 | 
  927 |       await expect
  928 |         .poll(
  929 |           async () => {
  930 |             target = await this.findDeliverableRowInTree(
  931 |               this.clientTreeAsideOrShell(),
  932 |               label,
  933 |               options,
  934 |             );
  935 |             return target !== null;
  936 |           },
  937 |           {
  938 |             timeout: 45_000,
  939 |             intervals: [500, 1000, 2000, 3000],
  940 |             message: `Deliverable "${label}" should appear after searching in Search Clients`,
  941 |           },
  942 |         )
> 943 |         .toBe(true);
      |          ^ Error: Deliverable "sample deliverable" should appear after searching in Search Clients
  944 | 
  945 |       if (!target) {
  946 |         target = await this.resolveDeliverableRowInSidebar(label, options);
  947 |       }
  948 | 
  949 |       if (!target) {
  950 |         throw new Error(
  951 |           `Deliverable "${label}" not found in sidebar tree` +
  952 |             (clientLabel && options?.projectLabel
  953 |               ? ` (expanded: ${clientLabel} → ${options.projectLabel}; searched: "${label}")`
  954 |               : ` (searched: "${label}")`) +
  955 |             '.',
  956 |         );
  957 |       }
  958 | 
  959 |       await target.scrollIntoViewIfNeeded();
  960 |       await target.click();
  961 | 
  962 |       if (options?.confirmStorylineLeave) {
  963 |         await this.confirmStorylineGenerationLeaveIfPrompted();
  964 |       }
  965 | 
  966 |       await this.page.waitForLoadState('domcontentloaded');
  967 | 
  968 |       if (options?.skipStageReadyWait) {
  969 |         const leftName = options?.waitUntilLeftDeliverable?.trim();
  970 |         if (leftName) {
  971 |           const leftRe = new RegExp(`^${escapeForRegex(leftName)}$`, 'i');
  972 |           await expect(this.page.getByRole('heading', { name: leftRe, level: 2 })).not.toBeVisible({
  973 |             timeout: 20_000,
  974 |           });
  975 |         }
  976 | 
  977 |         try {
  978 |           await this.waitForDeliverableOpenInMainView(label, 12_000);
  979 |         } catch {
  980 |           await target.scrollIntoViewIfNeeded();
  981 |           await target.click();
  982 |           if (options?.confirmStorylineLeave) {
  983 |             await this.confirmStorylineGenerationLeaveIfPrompted();
  984 |           }
  985 |           await this.page.waitForLoadState('domcontentloaded');
  986 |           await this.waitForDeliverableOpenInMainView(label, 20_000);
  987 |         }
  988 |       } else {
  989 |         await expect(this.page.getByRole('button', { name: /1\.\s*Brief/i }).or(
  990 |           this.page.getByRole('button', { name: /^1$/ }),
  991 |         ).first()).toBeVisible({ timeout: 12_000 });
  992 |       }
  993 |     });
  994 |   }
  995 | }
  996 | 
```