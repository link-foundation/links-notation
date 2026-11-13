author:	blommish
association:	none
edited:	false
status:	none
--
Fix from claude was this, but would prefer not to
```kotlin
// ktlint embeds the Kotlin compiler and breaks if dependency management aligns it to the
// project's Kotlin version. Keep it on the version ktlint was built against.
configurations.matching { it.name.startsWith("ktlint") }.configureEach {
    resolutionStrategy.eachDependency {
        if (requested.group == "org.jetbrains.kotlin") {
            useVersion("2.2.21")
        }
    }
}
```
--
author:	paul-dingemans
association:	member
edited:	false
status:	none
--
It is correct that Ktlint 1.8.0 (and before) are not compatible with Kotlin 2.4. In [ktlint 2.0.0-ALPHA-4](https://github.com/ktlint/ktlint/releases/tag/2.0.0-ALPHA-4) this problem has been resolved.
--
author:	blommish
association:	none
edited:	false
status:	none
--
Thanks @paul-dingemans 
--
author:	masterflitzer
association:	none
edited:	false
status:	none
--
would be great if a fix could be backported to v1 for usage in the meantime where v2 is alpha
--
author:	paul-dingemans
association:	member
edited:	false
status:	none
--
> would be great if a fix could be backported to v1 for usage in the meantime where v2 is alpha

Sorry, but you have to wait until V2 release. Releasing 1.x version is very hard at the moment as Pinterest no longer backs the project. It shouldn't take too long...
--
author:	realdadfish
association:	none
edited:	true
status:	none
--
@paul-dingemans I'm using 2.0.0-ALPHA-4 and see this issue anyways with Kotlin 2.4.21 (it works nicely with 2.4.10):

```
org.gradle.api.tasks.TaskExecutionException: Execution failed for task ':<myModule>:lintKotlinMain' (registered by plugin 'org.jmailen.kotlinter').
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.lambda$doExecute$1(DefaultTaskNodeExecutor.java:367)
        at org.gradle.internal.Try$Failure.ifSuccessfulOrElse(Try.java:288)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.doExecute(DefaultTaskNodeExecutor.java:365)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeTrackingTaskIdentity(DefaultTaskNodeExecutor.java:332)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeFinalizingProperties(DefaultTaskNodeExecutor.java:318)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeSkippingWithNoActions(DefaultTaskNodeExecutor.java:289)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeSkippingOnlyIf(DefaultTaskNodeExecutor.java:272)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeCatchingFailures(DefaultTaskNodeExecutor.java:228)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeWithFallbackOperationId(DefaultTaskNodeExecutor.java:197)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.executeWithLifecycle(DefaultTaskNodeExecutor.java:171)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.access$000(DefaultTaskNodeExecutor.java:67)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor$1.run(DefaultTaskNodeExecutor.java:136)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:30)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:27)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:67)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:60)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:167)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:60)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:48)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.execute(DefaultTaskNodeExecutor.java:133)
        at org.gradle.execution.plan.LocalTaskNode.execute(LocalTaskNode.java:229)
        at org.gradle.execution.DefaultBuildWorkExecutor.lambda$executePlan$0(DefaultBuildWorkExecutor.java:153)
        at org.gradle.execution.plan.DefaultPlanExecutor$ExecutorWorker.lambda$execute$0(DefaultPlanExecutor.java:476)
        at org.gradle.internal.operations.CurrentBuildOperationRef.with(CurrentBuildOperationRef.java:85)
        at org.gradle.execution.plan.DefaultPlanExecutor$ExecutorWorker.execute(DefaultPlanExecutor.java:475)
        at org.gradle.execution.plan.DefaultPlanExecutor$ExecutorWorker.run(DefaultPlanExecutor.java:392)
        at org.gradle.internal.concurrent.ExecutorPolicy$CatchAndRecordFailures.onExecute(ExecutorPolicy.java:65)
        at org.gradle.internal.concurrent.AbstractManagedExecutor$1.run(AbstractManagedExecutor.java:47)
        at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(ThreadPoolExecutor.java:1144)
        at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(ThreadPoolExecutor.java:642)
        at java.base/java.lang.Thread.run(Thread.java:1583)
Caused by: org.gradle.workers.WorkerExecutionException: There was a failure while executing work items
        at org.gradle.workers.internal.DefaultWorkerExecutor.workerExecutionException(DefaultWorkerExecutor.java:209)
        at org.gradle.workers.internal.DefaultWorkerExecutor.await(DefaultWorkerExecutor.java:203)
        at org.gradle.workers.internal.DefaultWorkerExecutor$DefaultWorkQueue.await(DefaultWorkerExecutor.java:298)
        at org.jmailen.gradle.kotlinter.tasks.LintTask.run(LintTask.kt:49)
        at java.base/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
        at java.base/java.lang.reflect.Method.invoke(Method.java:580)
        at org.gradle.internal.reflect.JavaMethod.invoke(JavaMethod.java:125)
        at org.gradle.api.internal.project.taskfactory.IncrementalTaskAction.doExecute(IncrementalTaskAction.java:45)
        at org.gradle.api.internal.project.taskfactory.StandardTaskAction.execute(StandardTaskAction.java:51)
        at org.gradle.api.internal.project.taskfactory.IncrementalTaskAction.execute(IncrementalTaskAction.java:26)
        at org.gradle.api.internal.project.taskfactory.StandardTaskAction.execute(StandardTaskAction.java:29)
        at org.gradle.api.internal.tasks.execution.TaskExecution$3.run(TaskExecution.java:268)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:30)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$1.execute(DefaultBuildOperationRunner.java:27)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:67)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:60)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:167)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:60)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.run(DefaultBuildOperationRunner.java:48)
        at org.gradle.api.internal.tasks.execution.TaskExecution.executeAction(TaskExecution.java:253)
        at org.gradle.api.internal.tasks.execution.TaskExecution.executeActions(TaskExecution.java:236)
        at org.gradle.api.internal.tasks.execution.TaskExecution.executeWithPreviousOutputFiles(TaskExecution.java:219)
        at org.gradle.api.internal.tasks.execution.TaskExecution.execute(TaskExecution.java:185)
        at org.gradle.internal.execution.steps.ExecuteStep.executeInternal(ExecuteStep.java:167)
        at org.gradle.internal.execution.steps.ExecuteStep.access$000(ExecuteStep.java:47)
        at org.gradle.internal.execution.steps.ExecuteStep$1.call(ExecuteStep.java:137)
        at org.gradle.internal.execution.steps.ExecuteStep$1.call(ExecuteStep.java:134)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$CallableBuildOperationWorker.execute(DefaultBuildOperationRunner.java:210)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$CallableBuildOperationWorker.execute(DefaultBuildOperationRunner.java:205)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:67)
        at org.gradle.internal.operations.DefaultBuildOperationRunner$2.execute(DefaultBuildOperationRunner.java:60)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:167)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.execute(DefaultBuildOperationRunner.java:60)
        at org.gradle.internal.operations.DefaultBuildOperationRunner.call(DefaultBuildOperationRunner.java:54)
        at org.gradle.internal.execution.steps.ExecuteStep.execute(ExecuteStep.java:134)
        at org.gradle.internal.execution.steps.ExecuteStep$Mutable.execute(ExecuteStep.java:80)
        at org.gradle.internal.execution.steps.CancelExecutionStep.execute(CancelExecutionStep.java:42)
        at org.gradle.internal.execution.steps.TimeoutStep.executeWithoutTimeout(TimeoutStep.java:75)
        at org.gradle.internal.execution.steps.TimeoutStep.execute(TimeoutStep.java:55)
        at org.gradle.internal.execution.steps.PreCreateOutputParentsStep.execute(PreCreateOutputParentsStep.java:51)
        at org.gradle.internal.execution.steps.PreCreateOutputParentsStep.execute(PreCreateOutputParentsStep.java:29)
        at org.gradle.internal.execution.steps.RemovePreviousOutputsStep.executeMutable(RemovePreviousOutputsStep.java:67)
        at org.gradle.internal.execution.steps.RemovePreviousOutputsStep.executeMutable(RemovePreviousOutputsStep.java:39)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.BroadcastChangingOutputsStep.execute(BroadcastChangingOutputsStep.java:42)
        at org.gradle.internal.execution.steps.BroadcastChangingOutputsStep.execute(BroadcastChangingOutputsStep.java:24)
        at org.gradle.internal.execution.steps.CaptureOutputsAfterExecutionStep.execute(CaptureOutputsAfterExecutionStep.java:69)
        at org.gradle.internal.execution.steps.CaptureOutputsAfterExecutionStep.execute(CaptureOutputsAfterExecutionStep.java:46)
        at org.gradle.internal.execution.steps.ResolveInputChangesStep.executeMutable(ResolveInputChangesStep.java:39)
        at org.gradle.internal.execution.steps.ResolveInputChangesStep.executeMutable(ResolveInputChangesStep.java:28)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.BuildCacheStep.executeWithoutCache(BuildCacheStep.java:189)
        at org.gradle.internal.execution.steps.BuildCacheStep.executeAndStoreInCache(BuildCacheStep.java:145)
        at org.gradle.internal.execution.steps.BuildCacheStep.lambda$executeWithCache$3(BuildCacheStep.java:104)
        at java.base/java.util.Optional.orElseGet(Optional.java:364)
        at org.gradle.internal.execution.steps.BuildCacheStep.lambda$executeWithCache$1(BuildCacheStep.java:104)
        at org.gradle.internal.Try$Success.map(Try.java:170)
        at org.gradle.internal.execution.steps.BuildCacheStep.executeWithCache(BuildCacheStep.java:88)
        at org.gradle.internal.execution.steps.BuildCacheStep.lambda$execute$0(BuildCacheStep.java:75)
        at org.gradle.internal.Either$Left.fold(Either.java:116)
        at org.gradle.internal.execution.caching.CachingState.fold(CachingState.java:62)
        at org.gradle.internal.execution.steps.BuildCacheStep.execute(BuildCacheStep.java:74)
        at org.gradle.internal.execution.steps.BuildCacheStep.execute(BuildCacheStep.java:49)
        at org.gradle.internal.execution.steps.StoreExecutionStateStep.executeMutable(StoreExecutionStateStep.java:46)
        at org.gradle.internal.execution.steps.StoreExecutionStateStep.executeMutable(StoreExecutionStateStep.java:35)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.SkipUpToDateStep.executeBecause(SkipUpToDateStep.java:75)
        at org.gradle.internal.execution.steps.SkipUpToDateStep.lambda$execute$2(SkipUpToDateStep.java:53)
        at java.base/java.util.Optional.orElseGet(Optional.java:364)
        at org.gradle.internal.execution.steps.SkipUpToDateStep.execute(SkipUpToDateStep.java:53)
        at org.gradle.internal.execution.steps.SkipUpToDateStep.execute(SkipUpToDateStep.java:35)
        at org.gradle.internal.execution.steps.legacy.MarkSnapshottingInputsFinishedStep.execute(MarkSnapshottingInputsFinishedStep.java:37)
        at org.gradle.internal.execution.steps.legacy.MarkSnapshottingInputsFinishedStep.execute(MarkSnapshottingInputsFinishedStep.java:27)
        at org.gradle.internal.execution.steps.ResolveMutableCachingStateStep.executeDelegate(ResolveMutableCachingStateStep.java:70)
        at org.gradle.internal.execution.steps.ResolveMutableCachingStateStep.executeDelegate(ResolveMutableCachingStateStep.java:32)
        at org.gradle.internal.execution.steps.AbstractResolveCachingStateStep.execute(AbstractResolveCachingStateStep.java:69)
        at org.gradle.internal.execution.steps.AbstractResolveCachingStateStep.execute(AbstractResolveCachingStateStep.java:37)
        at org.gradle.internal.execution.steps.ResolveChangesStep.executeMutable(ResolveChangesStep.java:63)
        at org.gradle.internal.execution.steps.ResolveChangesStep.executeMutable(ResolveChangesStep.java:34)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.ValidateStep$Mutable.executeDelegate(ValidateStep.java:79)
        at org.gradle.internal.execution.steps.ValidateStep$Mutable.executeDelegate(ValidateStep.java:65)
        at org.gradle.internal.execution.steps.ValidateStep.execute(ValidateStep.java:105)
        at org.gradle.internal.execution.steps.ValidateStep$Mutable.execute(ValidateStep.java:65)
        at org.gradle.internal.execution.steps.CaptureMutableStateBeforeExecutionStep.executeMutable(CaptureMutableStateBeforeExecutionStep.java:86)
        at org.gradle.internal.execution.steps.CaptureMutableStateBeforeExecutionStep.execute(CaptureMutableStateBeforeExecutionStep.java:65)
        at org.gradle.internal.execution.steps.CaptureMutableStateBeforeExecutionStep.execute(CaptureMutableStateBeforeExecutionStep.java:45)
        at org.gradle.internal.execution.steps.SkipEmptyMutableWorkStep.executeWithNonEmptySources(SkipEmptyMutableWorkStep.java:210)
        at org.gradle.internal.execution.steps.SkipEmptyMutableWorkStep.executeMutable(SkipEmptyMutableWorkStep.java:90)
        at org.gradle.internal.execution.steps.SkipEmptyMutableWorkStep.executeMutable(SkipEmptyMutableWorkStep.java:53)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.legacy.MarkSnapshottingInputsStartedStep.execute(MarkSnapshottingInputsStartedStep.java:38)
        at org.gradle.internal.execution.steps.LoadPreviousExecutionStateStep.executeMutable(LoadPreviousExecutionStateStep.java:36)
        at org.gradle.internal.execution.steps.LoadPreviousExecutionStateStep.executeMutable(LoadPreviousExecutionStateStep.java:23)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.HandleStaleOutputsStep.executeMutable(HandleStaleOutputsStep.java:77)
        at org.gradle.internal.execution.steps.HandleStaleOutputsStep.executeMutable(HandleStaleOutputsStep.java:43)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.AssignMutableWorkspaceStep.lambda$executeMutable$0(AssignMutableWorkspaceStep.java:34)
        at org.gradle.api.internal.tasks.execution.TaskExecution$4.withWorkspace(TaskExecution.java:314)
        at org.gradle.internal.execution.steps.AssignMutableWorkspaceStep.executeMutable(AssignMutableWorkspaceStep.java:30)
        at org.gradle.internal.execution.steps.AssignMutableWorkspaceStep.executeMutable(AssignMutableWorkspaceStep.java:21)
        at org.gradle.internal.execution.steps.MutableStep.execute(MutableStep.java:26)
        at org.gradle.internal.execution.steps.ChoosePipelineStep.execute(ChoosePipelineStep.java:40)
        at org.gradle.internal.execution.steps.ChoosePipelineStep.execute(ChoosePipelineStep.java:23)
        at org.gradle.internal.execution.steps.ExecuteWorkBuildOperationFiringStep.lambda$execute$2(ExecuteWorkBuildOperationFiringStep.java:67)
        at java.base/java.util.Optional.orElseGet(Optional.java:364)
        at org.gradle.internal.execution.steps.ExecuteWorkBuildOperationFiringStep.execute(ExecuteWorkBuildOperationFiringStep.java:67)
        at org.gradle.internal.execution.steps.ExecuteWorkBuildOperationFiringStep.execute(ExecuteWorkBuildOperationFiringStep.java:39)
        at org.gradle.internal.execution.steps.IdentityCacheStep.execute(IdentityCacheStep.java:46)
        at org.gradle.internal.execution.steps.IdentityCacheStep.execute(IdentityCacheStep.java:34)
        at org.gradle.internal.execution.steps.IdentifyStep.execute(IdentifyStep.java:56)
        at org.gradle.internal.execution.steps.IdentifyStep.execute(IdentifyStep.java:38)
        at org.gradle.internal.execution.impl.DefaultExecutionEngine$1.execute(DefaultExecutionEngine.java:68)
        at org.gradle.api.internal.tasks.execution.DefaultTaskNodeExecutor.doExecute(DefaultTaskNodeExecutor.java:364)
        ... 28 more
Caused by: org.gradle.workers.internal.DefaultWorkerExecutor$WorkExecutionException: A failure occurred while executing org.jmailen.gradle.kotlinter.tasks.lint.LintWorkerAction
        at org.gradle.workers.internal.DefaultWorkerExecutor$WorkItemExecution.waitForCompletion(DefaultWorkerExecutor.java:273)
        at org.gradle.internal.work.DefaultAsyncWorkTracker.lambda$waitForItemsAndGatherFailures$2(DefaultAsyncWorkTracker.java:132)
        at org.gradle.internal.Factories$1.create(Factories.java:30)
        at org.gradle.internal.work.DefaultWorkerLeaseService.lambda$withoutLocksBlocking$0(DefaultWorkerLeaseService.java:406)
        at org.gradle.internal.work.ResourceLockStatistics$1.measure(ResourceLockStatistics.java:43)
        at org.gradle.internal.work.DefaultWorkerLeaseService.withoutLocksBlocking(DefaultWorkerLeaseService.java:401)
        at org.gradle.internal.work.DefaultWorkerLeaseService.blocking(DefaultWorkerLeaseService.java:261)
        at org.gradle.internal.work.DefaultWorkerLeaseService.blocking(DefaultWorkerLeaseService.java:243)
        at org.gradle.internal.work.DefaultAsyncWorkTracker.lambda$waitForItemsAndGatherFailures$1(DefaultAsyncWorkTracker.java:128)
        at org.gradle.internal.Factories$1.create(Factories.java:30)
        at org.gradle.internal.resources.AbstractResourceLockRegistry.whileDisallowingLockChanges(AbstractResourceLockRegistry.java:51)
        at org.gradle.internal.work.DefaultWorkerLeaseService.whileDisallowingProjectLockChanges(DefaultWorkerLeaseService.java:266)
        at org.gradle.internal.work.DefaultAsyncWorkTracker.waitForItemsAndGatherFailures(DefaultAsyncWorkTracker.java:127)
        at org.gradle.internal.work.DefaultAsyncWorkTracker.waitForItemsAndGatherFailures(DefaultAsyncWorkTracker.java:89)
        at org.gradle.internal.work.DefaultAsyncWorkTracker.waitForAll(DefaultAsyncWorkTracker.java:79)
        at org.gradle.internal.work.DefaultAsyncWorkTracker.waitForCompletion(DefaultAsyncWorkTracker.java:73)
        at org.gradle.workers.internal.DefaultWorkerExecutor.await(DefaultWorkerExecutor.java:201)
        ... 141 more
Caused by: org.jmailen.gradle.kotlinter.support.KotlinterError: lint worker execution error while processing /Users/thomaskeller/Entwicklung/GLS/src/parcelos-android-monorepo2/driver/businessevents-domain/src/main/kotlin/eu/gls/mobile/driver/businessevents/domain/model/StateMachine.kt
        at org.jmailen.gradle.kotlinter.tasks.lint.LintWorkerAction.execute(LintWorkerAction.kt:65)
        at app//org.gradle.workers.internal.DefaultWorkerServer.execute(DefaultWorkerServer.java:68)
        at app//org.gradle.workers.internal.AbstractClassLoaderWorker$1.create(AbstractClassLoaderWorker.java:54)
        at app//org.gradle.workers.internal.AbstractClassLoaderWorker$1.create(AbstractClassLoaderWorker.java:48)
        at app//org.gradle.internal.classloader.ClassLoaderUtils.executeInClassloader(ClassLoaderUtils.java:103)
        at app//org.gradle.workers.internal.AbstractClassLoaderWorker.executeInClassLoader(AbstractClassLoaderWorker.java:48)
        at app//org.gradle.workers.internal.IsolatedClassloaderWorker.run(IsolatedClassloaderWorker.java:49)
        at app//org.gradle.workers.internal.IsolatedClassloaderWorker.run(IsolatedClassloaderWorker.java:30)
        at app//org.gradle.workers.internal.WorkerDaemonServer.run(WorkerDaemonServer.java:109)
        at app//org.gradle.workers.internal.WorkerDaemonServer.run(WorkerDaemonServer.java:78)
        at app//org.gradle.process.internal.worker.request.WorkerAction.lambda$run$1(WorkerAction.java:150)
        at app//org.gradle.process.internal.worker.child.WorkerLogEventListener.withWorkerLoggingProtocol(WorkerLogEventListener.java:41)
        at app//org.gradle.process.internal.worker.request.WorkerAction.lambda$run$0(WorkerAction.java:150)
        at app//org.gradle.internal.operations.CurrentBuildOperationRef.with(CurrentBuildOperationRef.java:85)
        at app//org.gradle.process.internal.worker.request.WorkerAction.run(WorkerAction.java:142)
        at java.base@21.0.8/jdk.internal.reflect.DirectMethodHandleAccessor.invoke(DirectMethodHandleAccessor.java:103)
        at java.base@21.0.8/java.lang.reflect.Method.invoke(Method.java:580)
        at app//org.gradle.internal.dispatch.MethodInvocation.invokeOn(MethodInvocation.java:77)
        at app//org.gradle.internal.dispatch.ReflectionDispatch.dispatch(ReflectionDispatch.java:28)
        at app//org.gradle.internal.dispatch.ReflectionDispatch.dispatch(ReflectionDispatch.java:19)
        at app//org.gradle.internal.remote.internal.hub.MessageHubBackedObjectConnection$DispatchWrapper.dispatch(MessageHubBackedObjectConnection.java:183)
        at app//org.gradle.internal.remote.internal.hub.MessageHubBackedObjectConnection$DispatchWrapper.dispatch(MessageHubBackedObjectConnection.java:165)
        at app//org.gradle.internal.remote.internal.hub.MessageHub$Handler.run(MessageHub.java:414)
        at app//org.gradle.internal.concurrent.ExecutorPolicy$CatchAndRecordFailures.onExecute(ExecutorPolicy.java:65)
        at app//org.gradle.internal.concurrent.AbstractManagedExecutor$1.run(AbstractManagedExecutor.java:47)
        ... 3 more
Caused by: java.lang.ExceptionInInitializerError
        at com.pinterest.ktlint.rule.engine.internal.RuleExecutionContext$Companion.createRuleExecutionContext$ktlint_rule_engine(RuleExecutionContext.kt:222)
        at com.pinterest.ktlint.rule.engine.internal.CodeFormatter.format(CodeFormatter.kt:51)
        at com.pinterest.ktlint.rule.engine.internal.CodeFormatter.format(CodeFormatter.kt:28)
        at com.pinterest.ktlint.rule.engine.api.KtLintRuleEngine.lint(KtLintRuleEngine.kt:91)
        at org.jmailen.gradle.kotlinter.tasks.lint.LintWorkerAction.execute(LintWorkerAction.kt:52)
        ... 27 more
Caused by: java.lang.IllegalStateException: Extensions storage is not registered
        at org.jetbrains.kotlin.compiler.plugin.ExtensionPointUtilsKt.getCompilerExtensions(ExtensionPointUtils.kt:14)
        at org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment$Companion.configureProjectEnvironment(KotlinCoreEnvironment.kt:654)
        at org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment.<init>(KotlinCoreEnvironment.kt:214)
        at org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment.<init>(KotlinCoreEnvironment.kt)
        at org.jetbrains.kotlin.cli.jvm.compiler.KotlinCoreEnvironment$Companion.createForProduction(KotlinCoreEnvironment.kt:435)
        at com.pinterest.ktlint.rule.engine.core.api.KtlintKotlinCompilerKt.initPsiFileFactory(KtlintKotlinCompiler.kt:77)
        at com.pinterest.ktlint.rule.engine.core.api.KtlintKotlinCompilerKt.access$initPsiFileFactory(KtlintKotlinCompiler.kt:1)
        at com.pinterest.ktlint.rule.engine.core.api.KtlintKotlinCompiler.<clinit>(KtlintKotlinCompiler.kt:35)
        ... 32 more
```

This is my `buildEnvironment`:

```shell
$ gradle buildEnvironment | grep ktlint
|    \--- io.github.ktlint.core:ktlint-cli:2.0.0-ALPHA-4
|         +--- io.github.ktlint.core:ktlint-logger:2.0.0-ALPHA-4
|         +--- io.github.ktlint.core:ktlint-cli-reporter-baseline:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-logger:2.0.0-ALPHA-4 (*)
|         |    +--- io.github.ktlint.core:ktlint-rule-engine-core:2.0.0-ALPHA-4
|         |    |    +--- io.github.ktlint.core:ktlint-logger:2.0.0-ALPHA-4 (*)
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4
|         +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-cli-reporter-plain:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-com-pinterest-backward-compatibility:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-logger:2.0.0-ALPHA-4 (*)
|         |    +--- io.github.ktlint.core:ktlint-rule-engine-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-rule-engine:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-logger:2.0.0-ALPHA-4 (*)
|         |    +--- io.github.ktlint.core:ktlint-rule-engine-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-ruleset-standard:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-logger:2.0.0-ALPHA-4 (*)
|         |    +--- io.github.ktlint.core:ktlint-cli-ruleset-core:2.0.0-ALPHA-4
|         |    |    +--- io.github.ktlint.core:ktlint-rule-engine-core:2.0.0-ALPHA-4 (*)
|         |    +--- io.github.ktlint.core:ktlint-rule-engine-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-cli-reporter-checkstyle:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-cli-reporter-json:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-cli-reporter-format:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-cli-reporter-html:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         +--- io.github.ktlint.core:ktlint-cli-reporter-plain-summary:2.0.0-ALPHA-4
|         |    +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
|         \--- io.github.ktlint.core:ktlint-cli-reporter-sarif:2.0.0-ALPHA-4
|              +--- io.github.ktlint.core:ktlint-cli-reporter-core:2.0.0-ALPHA-4 (*)
```

--
author:	realdadfish
association:	none
edited:	true
status:	none
--
Ok, this is gone in the current `main` branch. I tested with 5775b58d0f996e84c9c67205342f1c5620de6a4a and the issue is gone there. @paul-dingemans Can you release an official ALPHA-5 in the meantime for proper Kotlin 2.4.2x support? That would be great!
--
